import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useCreateMediaAsset,
  useCreateMediaUploadUrl,
  useDeleteMediaAsset,
  useMediaDownloadUrl,
} from '../features/media/hooks/useMedia';
import { useCreateTaskStep, useTaskSteps, useUpdateTaskStep } from '../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../navigation/types';
import { getCurrentUserId } from '../shared/api/authTokenProvider';
import type { MediaType } from '../shared/api/canplanTypes';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import { colors, radius, shadow, spacing, typography } from '../shared/theme/tokens';

type StepNavigation = NativeStackNavigationProp<MainStackParamList, 'CreateTaskStep'>;
type StepRoute = RouteProp<MainStackParamList, 'CreateTaskStep'>;
type SelectedImage = ImagePicker.ImagePickerAsset;

const TEAL = '#3DB8AD';
const TEAL_LIGHT = '#EBF9F8';
const PHOTO_LIGHT = '#FEF0EB';

interface SelectedMedia {
  uri: string;
  mediaType: MediaType;
  mimeType: string;
  size?: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function contentTypeForAsset(asset: SelectedImage): string {
  if (asset.mimeType) return asset.mimeType;
  const ext = asset.uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'mov' || ext === 'mp4') return 'video/mp4';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function CreateTaskStepScreen() {
  const navigation = useNavigation<StepNavigation>();
  const route = useRoute<StepRoute>();
  const insets = useSafeAreaInsets();
  const { taskId, stepId } = route.params;
  const isEditing = Boolean(stepId);

  const stepsQuery = useTaskSteps(taskId);
  const createStepMutation = useCreateTaskStep();
  const updateStepMutation = useUpdateTaskStep();
  const createMediaUploadUrlMutation = useCreateMediaUploadUrl();
  const createMediaAssetMutation = useCreateMediaAsset();
  const deleteMediaAssetMutation = useDeleteMediaAsset();

  const currentStep = useMemo(
    () => stepsQuery.data?.pages.flatMap((p) => p.items).find((s) => s.stepId === stepId),
    [stepId, stepsQuery.data],
  );
  const existingAsset = currentStep?.mediaAssets[0];
  const existingMediaQuery = useMediaDownloadUrl(taskId, existingAsset?.assetId ?? '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [initialTitle, setInitialTitle] = useState('');
  const [initialDescription, setInitialDescription] = useState('');
  const [hydratedStepId, setHydratedStepId] = useState<string>();
  const [busyAction, setBusyAction] = useState<string>();
  const [inlineError, setInlineError] = useState<string>();

  // Newly selected/recorded media (not yet uploaded) and existing-media removal flag.
  const [pendingMedia, setPendingMedia] = useState<SelectedMedia>();
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);
  const [deleteMediaVisible, setDeleteMediaVisible] = useState(false);
  const [descEditorVisible, setDescEditorVisible] = useState(false);

  // Audio recording (expo-audio).
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const isRecording = recorderState.isRecording;
  // Plain-JS mirror of the recording state so unmount cleanup never has to touch
  // the native recorder object (its getters throw once it has been released).
  const isRecordingRef = useRef(false);

  const isBusy =
    Boolean(busyAction) ||
    createStepMutation.isPending ||
    updateStepMutation.isPending ||
    createMediaUploadUrlMutation.isPending ||
    createMediaAssetMutation.isPending ||
    deleteMediaAssetMutation.isPending;

  const isLoadingStep = isEditing && stepsQuery.isLoading;
  const trimmedTitle = title.trim();

  // What is currently previewed: a fresh pick/recording, else the existing upload.
  const existingMediaUrl = removeExistingMedia ? undefined : existingMediaQuery.data?.downloadUrl;
  const existingMediaType: MediaType | undefined = removeExistingMedia ? undefined : existingAsset?.type;
  const previewUri = pendingMedia?.uri ?? existingMediaUrl;
  const previewType: MediaType | undefined = pendingMedia?.mediaType ?? existingMediaType;
  const isPendingPreview = Boolean(pendingMedia);

  const photoSelected = previewType === 'IMAGE' || previewType === 'VIDEO';
  const audioSelected = previewType === 'AUDIO';

  // Preview players (expo-video / expo-audio). Each hook re-creates its player
  // when the gated source string changes, so feeding the current preview URI is enough.
  const videoPlayer = useVideoPlayer(previewType === 'VIDEO' ? previewUri ?? null : null, (player) => {
    player.loop = false;
  });
  const audioPlayer = useAudioPlayer(previewType === 'AUDIO' ? previewUri ?? null : null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  useEffect(() => {
    if (!currentStep || hydratedStepId === currentStep.stepId) return;
    setTitle(currentStep.text);
    setInitialTitle(currentStep.text);
    setDescription(currentStep.description ?? '');
    setInitialDescription(currentStep.description ?? '');
    setHydratedStepId(currentStep.stepId);
  }, [currentStep, hydratedStepId]);

  // Allow playback through the iOS silent switch.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // Loop a finished preview back to the start so the play button works again.
  useEffect(() => {
    if (!audioStatus.didJustFinish) return;
    try {
      void audioPlayer.seekTo(0);
    } catch {
      // Player released between the status update and this effect — safe to ignore.
    }
  }, [audioStatus.didJustFinish, audioPlayer]);

  // Stop a recording still in progress if the user leaves the screen. Guarded so a
  // teardown race (recorder released before this runs) can't surface a native error.
  useEffect(() => {
    return () => {
      if (!isRecordingRef.current) return;
      try {
        void audioRecorder.stop().catch(() => undefined);
      } catch {
        // The native recorder was already released during teardown — nothing to do.
      }
    };
  }, [audioRecorder]);

  const navigateBack = () => {
    if (isBusy) return;
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('CreateTask', { taskId });
  };

  // ── Media upload ───────────────────────────────────────────────────────────

  const uploadMedia = async (media: SelectedMedia): Promise<string> => {
    const target = await createMediaUploadUrlMutation.mutateAsync({
      taskId,
      contentType: media.mimeType,
      fileName: `step-media.${media.mimeType.split('/')[1] || 'bin'}`,
    });
    if (!target) throw new Error('Could not prepare the upload. Please try again.');

    const bytes = await (await fetch(media.uri)).blob();
    const putResponse = await fetch(target.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': media.mimeType },
      body: bytes,
    });
    if (!putResponse.ok) {
      throw new Error(`Upload failed (${putResponse.status}). Please try again.`);
    }

    const ownerId = await getCurrentUserId();
    const asset = await createMediaAssetMutation.mutateAsync({
      taskId,
      s3Key: target.s3Key,
      type: media.mediaType,
      mimeType: media.mimeType,
      ownerId,
      size: media.size ?? bytes.size,
    });
    if (!asset) throw new Error('Could not register the media. Please try again.');
    return asset.assetId;
  };

  // ── Photo / Video picker ─────────────────────────────────────────────────────

  const pickPhotoOrVideo = async (source: 'camera' | 'library') => {
    if (isBusy) return;
    setBusyAction('picker');
    setInlineError(undefined);
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          source === 'camera'
            ? 'Camera permission denied. Enable it in settings.'
            : 'Photo library permission denied. Enable it in settings.',
        );
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 120 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mimeType = contentTypeForAsset(asset);
        const isVideo = mimeType.startsWith('video/');
        setPendingMedia({
          uri: asset.uri,
          mediaType: isVideo ? 'VIDEO' : 'IMAGE',
          mimeType,
          size: asset.fileSize,
        });
        setRemoveExistingMedia(false);
      }
    } catch (error) {
      setInlineError(errorMessage(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  const showPhotoSourceOptions = () => {
    if (isBusy) return;
    Alert.alert('Add photo or video', 'Choose a source for this step.', [
      { text: 'Take photo / video', onPress: () => void pickPhotoOrVideo('camera') },
      { text: 'Choose from library', onPress: () => void pickPhotoOrVideo('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePhotoTilePress = () => {
    if (isBusy || isRecording) return;
    if (photoSelected) {
      setDeleteMediaVisible(true);
      return;
    }
    showPhotoSourceOptions();
  };

  // ── Audio recording ───────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setInlineError('Microphone permission denied. Enable it in settings.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      isRecordingRef.current = true;
    } catch (error) {
      setInlineError(errorMessage(error));
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      isRecordingRef.current = false;
      // Restore the playback-friendly audio mode now that recording is done.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = audioRecorder.uri;
      if (uri) {
        setPendingMedia({ uri, mediaType: 'AUDIO', mimeType: 'audio/m4a' });
        setRemoveExistingMedia(false);
      }
    } catch (error) {
      setInlineError(errorMessage(error));
    }
  };

  const handleAudioTilePress = () => {
    if (isRecording) {
      void stopRecording();
      return;
    }
    if (isBusy) return;
    if (audioSelected) {
      setDeleteMediaVisible(true);
      return;
    }
    void startRecording();
  };

  // ── Audio playback (preview) ────────────────────────────────────────────────

  const toggleAudioPlayback = () => {
    if (!previewUri) return;
    if (audioStatus.playing) audioPlayer.pause();
    else audioPlayer.play();
  };

  const stopAudioPlayback = () => {
    if (audioStatus.playing) audioPlayer.pause();
  };

  // ── Remove media (with confirmation + S3/DB delete for uploaded assets) ───────

  const confirmRemoveMedia = async () => {
    stopAudioPlayback();

    // Fresh pick/recording that was never uploaded — just discard locally.
    if (pendingMedia) {
      setPendingMedia(undefined);
      setDeleteMediaVisible(false);
      return;
    }

    // Deleting a step asset also clears its media slot server-side.
    if (currentStep && existingAsset) {
      setBusyAction('delete-media');
      setInlineError(undefined);
      try {
        await deleteMediaAssetMutation.mutateAsync({ taskId, assetId: existingAsset.assetId });
        setRemoveExistingMedia(true);
      } catch (error) {
        setInlineError(errorMessage(error));
      } finally {
        setBusyAction(undefined);
      }
    }
    setDeleteMediaVisible(false);
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!trimmedTitle || isBusy || isLoadingStep) return;
    stopAudioPlayback();

    let shouldGoBack = false;
    setBusyAction('step');
    setInlineError(undefined);
    try {
      const trimmedDescription = description.trim();
      if (!isEditing) {
        const order =
          (stepsQuery.data?.pages.flatMap((p) => p.items).reduce((max, s) => Math.max(max, s.order), 0) ?? 0) + 1;
        const createdStep = await createStepMutation.mutateAsync({
          taskId,
          order,
          text: trimmedTitle,
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
        });
        if (!createdStep) throw new Error('Step creation failed. Please try again.');

        if (pendingMedia) {
          const mediaAssetId = await uploadMedia(pendingMedia);
          await updateStepMutation.mutateAsync({
            taskId,
            stepId: createdStep.stepId,
            media: [{ type: pendingMedia.mediaType, assetId: mediaAssetId }],
          });
        }
        shouldGoBack = true;
        return;
      }

      if (!currentStep) throw new Error('Step not found. Go back and try again.');

      const textChanged = trimmedTitle !== initialTitle;
      const descriptionChanged = trimmedDescription !== initialDescription.trim();
      if (pendingMedia) {
        const mediaAssetId = await uploadMedia(pendingMedia);
        await updateStepMutation.mutateAsync({
          taskId,
          stepId: currentStep.stepId,
          ...(textChanged ? { text: trimmedTitle } : {}),
          ...(descriptionChanged ? { description: trimmedDescription || null } : {}),
          media: [{ type: pendingMedia.mediaType, assetId: mediaAssetId }],
        });
      } else if (textChanged || descriptionChanged) {
        await updateStepMutation.mutateAsync({
          taskId,
          stepId: currentStep.stepId,
          ...(textChanged ? { text: trimmedTitle } : {}),
          ...(descriptionChanged ? { description: trimmedDescription || null } : {}),
        });
      }
      shouldGoBack = true;
    } catch (error) {
      setInlineError(errorMessage(error));
    } finally {
      setBusyAction(undefined);
      if (shouldGoBack) navigateBack();
    }
  };

  // ── Loading / error states ───────────────────────────────────────────────────

  if (isLoadingStep) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading step…</Text>
      </View>
    );
  }

  if (isEditing && (stepsQuery.error || !currentStep)) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="alert-circle" size={36} color={colors.danger} />
        <Text accessibilityRole="alert" style={styles.stateText}>
          {stepsQuery.error?.message ?? 'This step could not be found.'}
        </Text>
        <Pressable accessibilityRole="button" onPress={navigateBack} style={styles.backPill}>
          <Text style={styles.cancelText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const canSave = Boolean(trimmedTitle) && !isBusy;
  const photoTileActive = photoSelected;
  const audioTileActive = audioSelected || isRecording;
  const isPlayingAudio = audioStatus.playing;
  const audioDurationSec = audioStatus.duration || 0;
  const audioPositionSec = audioStatus.currentTime || 0;
  const audioProgress = audioDurationSec > 0 ? Math.min(audioPositionSec / audioDurationSec, 1) : 0;
  const audioTimeMs = (audioPositionSec > 0 ? audioPositionSec : audioDurationSec) * 1000;
  const removingUploadedAsset = !pendingMedia && Boolean(existingAsset);

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          disabled={isBusy}
          onPress={navigateBack}
          style={({ pressed }) => [styles.headerBtn, pressed && !isBusy ? styles.pressed : null]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {isEditing ? 'Edit Step' : 'Add Step'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Update step' : 'Add step'}
          accessibilityState={{ disabled: !canSave, busy: isBusy }}
          disabled={!canSave}
          onPress={() => void handleSave()}
          style={({ pressed }) => [styles.headerBtn, styles.headerBtnRight, pressed && canSave ? styles.pressed : null]}
        >
          {isBusy ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.addText, !canSave ? styles.disabledText : null]}>
              {isEditing ? 'Update' : 'Add'}
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Error banner ── */}
        {inlineError ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        ) : null}

        {/* ── Step Title ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Step Title</Text>
          <TextInput
            accessibilityLabel="Step title"
            editable={!isBusy}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Get eggs from fridge"
            placeholderTextColor={colors.disabled}
            style={styles.titleInput}
            returnKeyType="done"
          />
        </View>

        {/* ── Media tiles ── */}
        <View style={styles.mediaTiles}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photoTileActive ? 'Remove photo or video' : 'Take photo or video'}
            accessibilityState={{ selected: photoTileActive }}
            disabled={isBusy || isRecording}
            onPress={handlePhotoTilePress}
            style={({ pressed }) => [
              styles.mediaTile,
              photoTileActive ? styles.mediaTilePhotoActive : styles.mediaTilePhotoIdle,
              pressed && !isBusy && !isRecording ? styles.pressed : null,
            ]}
          >
            <Ionicons name="camera-outline" size={36} color={photoTileActive ? colors.onPrimary : colors.primary} />
            <Text style={[styles.mediaTileLabel, photoTileActive ? styles.mediaTileLabelActive : styles.mediaTileLabelPhoto]}>
              {'Take Photo /\nVideo'}
            </Text>
            {photoTileActive ? (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                <Text style={styles.selectedBadgeText}>Selected</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Stop recording' : audioTileActive ? 'Remove audio' : 'Record audio'}
            accessibilityState={{ selected: audioTileActive }}
            disabled={isBusy && !isRecording}
            onPress={handleAudioTilePress}
            style={({ pressed }) => [
              styles.mediaTile,
              audioTileActive ? styles.mediaTileAudioActive : styles.mediaTileAudioIdle,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons
              name={isRecording ? 'stop-circle-outline' : 'mic-outline'}
              size={36}
              color={audioTileActive ? colors.onPrimary : TEAL}
            />
            <Text style={[styles.mediaTileLabel, audioTileActive ? styles.mediaTileLabelActive : styles.mediaTileLabelAudio]}>
              {isRecording ? `Recording\n${formatDuration(recorderState.durationMillis)}` : 'Record\nAudio'}
            </Text>
            {isRecording ? (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Tap to stop</Text>
              </View>
            ) : audioTileActive ? (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                <Text style={styles.selectedBadgeText}>Selected</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* ── Photo preview ── */}
        {previewUri && previewType === 'IMAGE' ? (
          <View style={styles.mediaPreview}>
            <Image
              accessibilityLabel="Step photo preview"
              source={{ uri: previewUri }}
              style={styles.previewMedia}
              resizeMode="cover"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              disabled={isBusy}
              onPress={() => setDeleteMediaVisible(true)}
              style={({ pressed }) => [styles.removeMediaBtn, pressed && !isBusy ? styles.pressed : null]}
            >
              <Ionicons name="close" size={16} color={colors.onPrimary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change photo"
              disabled={isBusy}
              onPress={showPhotoSourceOptions}
              style={({ pressed }) => [styles.changeMediaBtn, pressed && !isBusy ? styles.pressed : null]}
            >
              <Ionicons name="camera-outline" size={14} color={colors.onPrimary} />
              <Text style={styles.changeMediaText}>Change</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Video preview ── */}
        {previewUri && previewType === 'VIDEO' ? (
          <View style={styles.mediaPreview}>
            <VideoView
              accessibilityLabel="Step video preview"
              player={videoPlayer}
              style={styles.previewMedia}
              contentFit="cover"
              nativeControls
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove video"
              disabled={isBusy}
              onPress={() => setDeleteMediaVisible(true)}
              style={({ pressed }) => [styles.removeMediaBtn, pressed && !isBusy ? styles.pressed : null]}
            >
              <Ionicons name="close" size={16} color={colors.onPrimary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change video"
              disabled={isBusy}
              onPress={showPhotoSourceOptions}
              style={({ pressed }) => [styles.changeMediaBtn, pressed && !isBusy ? styles.pressed : null]}
            >
              <Ionicons name="camera-outline" size={14} color={colors.onPrimary} />
              <Text style={styles.changeMediaText}>Change</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Audio preview ── */}
        {previewUri && previewType === 'AUDIO' ? (
          <View style={styles.audioPreview}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPlayingAudio ? 'Pause audio' : 'Play audio'}
              onPress={toggleAudioPlayback}
              style={({ pressed }) => [styles.audioPlayBtn, pressed ? styles.pressed : null]}
            >
              <Ionicons
                name={isPlayingAudio ? 'pause' : 'play'}
                size={20}
                color={colors.onPrimary}
                style={isPlayingAudio ? undefined : { marginLeft: 2 }}
              />
            </Pressable>
            <View style={styles.audioPreviewInfo}>
              <Text style={styles.audioPreviewLabel}>
                {isPendingPreview ? 'New recording' : 'Audio note'}
              </Text>
              <View style={styles.audioTrack}>
                <View style={[styles.audioTrackFill, { width: `${audioProgress * 100}%` }]} />
              </View>
            </View>
            <Text style={styles.audioDuration}>
              {formatDuration(audioTimeMs)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Discard audio"
              disabled={isBusy}
              onPress={() => setDeleteMediaVisible(true)}
              style={({ pressed }) => [styles.audioDiscardBtn, pressed && !isBusy ? styles.pressed : null]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ) : null}

        {/* ── Description ── */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit step description"
          disabled={isBusy}
          onPress={() => setDescEditorVisible(true)}
          style={({ pressed }) => [
            styles.card,
            styles.descriptionCard,
            pressed && !isBusy ? styles.pressed : null,
          ]}
        >
          <Text style={styles.sectionLabel}>Description (Optional)</Text>
          <Text
            style={[styles.descriptionPreview, description.trim() ? null : styles.descriptionPlaceholder]}
          >
            {description.trim() ? description : 'Add more details about this step...'}
          </Text>
        </Pressable>

        {/* ── Add Step button ── */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Update step' : 'Add step'}
          accessibilityState={{ disabled: !canSave, busy: isBusy }}
          disabled={!canSave}
          onPress={() => void handleSave()}
          style={({ pressed }) => [
            styles.primaryButton,
            !canSave ? styles.primaryButtonDisabled : null,
            pressed && canSave ? styles.primaryButtonPressed : null,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isEditing ? 'Update Step' : 'Add Step'} {'✓'}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={deleteMediaVisible}
        title={removingUploadedAsset ? 'Delete media?' : 'Discard media?'}
        message={
          removingUploadedAsset
            ? 'This will permanently delete the media from this step. This cannot be undone.'
            : 'This will permanently delete the media you just added. This cannot be undone.'
        }
        confirmLabel={isBusy ? 'Deleting…' : 'Delete media'}
        cancelLabel="Keep media"
        destructive
        onConfirm={() => void confirmRemoveMedia()}
        onCancel={() => {
          if (!isBusy) setDeleteMediaVisible(false);
        }}
      />

      {/* ── Description editor (rises above the keyboard) ── */}
      <Modal
        visible={descEditorVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setDescEditorVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.descEditorRoot}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close description editor"
            onPress={() => setDescEditorVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.descEditorSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.descEditorHeader}>
              <Text style={styles.descEditorTitle}>Description</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done editing description"
                onPress={() => setDescEditorVisible(false)}
                style={({ pressed }) => [styles.descEditorDoneBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.descEditorDoneText}>Done</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Step description"
              autoFocus
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details about this step..."
              placeholderTextColor={colors.disabled}
              style={styles.descEditorInput}
              multiline
              textAlignVertical="top"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centeredState: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  backPill: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerBtnRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 22,
    color: colors.text,
  },
  cancelText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  addText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  disabledText: {
    color: colors.disabled,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEE8E8',
  },
  errorText: {
    flex: 1,
    ...typography.caption,
    color: colors.danger,
  },
  card: {
    padding: spacing.xl,
    borderRadius: radius.lg + spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  titleInput: {
    ...typography.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text,
    paddingTop: spacing.sm,
    minHeight: 80,
  },
  // ── Media tiles ─────────────────────────────────────────────────────────────
  mediaTiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mediaTile: {
    flex: 1,
    minHeight: 160,
    borderRadius: radius.lg + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  mediaTilePhotoIdle: {
    backgroundColor: PHOTO_LIGHT,
  },
  mediaTilePhotoActive: {
    backgroundColor: colors.primary,
    ...shadow.cardStrong,
  },
  mediaTileAudioIdle: {
    backgroundColor: TEAL_LIGHT,
  },
  mediaTileAudioActive: {
    backgroundColor: TEAL,
    ...shadow.card,
  },
  mediaTileLabel: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  mediaTileLabelPhoto: {
    color: colors.primary,
  },
  mediaTileLabelAudio: {
    color: TEAL,
  },
  mediaTileLabelActive: {
    color: colors.onPrimary,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  selectedBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.onPrimary,
    fontSize: 11,
  },
  // ── Photo / video preview ─────────────────────────────────────────────────────
  mediaPreview: {
    height: 210,
    borderRadius: radius.lg + spacing.xs,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27,34,48,0.65)',
  },
  changeMediaBtn: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(27,34,48,0.65)',
  },
  changeMediaText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  // ── Audio preview ──────────────────────────────────────────────────────────────
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg + spacing.xs,
    backgroundColor: TEAL_LIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${TEAL}55`,
  },
  audioPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPreviewInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  audioPreviewLabel: {
    ...typography.bodyStrong,
    color: TEAL,
  },
  audioTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: `${TEAL}33`,
    overflow: 'hidden',
  },
  audioTrackFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: TEAL,
  },
  audioDuration: {
    ...typography.caption,
    fontWeight: '700',
    color: TEAL,
    minWidth: 38,
    textAlign: 'right',
  },
  audioDiscardBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  // ── Description ────────────────────────────────────────────────────────────────
  descriptionCard: {
    minHeight: 130,
  },
  descriptionPreview: {
    ...typography.body,
    color: colors.text,
    paddingTop: spacing.sm,
    minHeight: 80,
  },
  descriptionPlaceholder: {
    color: colors.disabled,
  },
  // ── Description editor (above keyboard) ──────────────────────────────────────────
  descEditorRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 14, 6, 0.45)',
  },
  descEditorSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg + spacing.xs,
    borderTopRightRadius: radius.lg + spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  descEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  descEditorTitle: {
    ...typography.heading,
    color: colors.text,
  },
  descEditorDoneBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  descEditorDoneText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
  },
  descEditorInput: {
    ...typography.body,
    color: colors.text,
    minHeight: 120,
    maxHeight: 240,
    paddingVertical: spacing.sm,
  },
  // ── Primary button ──────────────────────────────────────────────────────────────
  primaryButton: {
    minHeight: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadow.cardStrong,
    marginTop: spacing.sm,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.72,
  },
});
