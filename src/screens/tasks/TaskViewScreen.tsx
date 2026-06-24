import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMediaDownloadUrl } from '../../features/media/hooks/useMedia';
import { useSimpleMode } from '../../features/users/hooks/useSimpleMode';
import { useTask } from '../../features/tasks/hooks/useTask';
import { useTaskSteps } from '../../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../../navigation/types';
import type { TaskStep } from '../../shared/api/canplanTypes';
import BackButton from '../../shared/components/BackButton';
import { colors, radius, shadow, spacing, typography } from '../../shared/theme/tokens';

type TaskViewNavigation = NativeStackNavigationProp<MainStackParamList, 'TaskView'>;
type TaskViewRoute = RouteProp<MainStackParamList, 'TaskView'>;

const TEAL = '#3DB8AD';
const TEAL_LIGHT = '#EBF9F8';

// ── Full-screen photo viewer ─────────────────────────────────────────────────

function PhotoViewer({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.viewerBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <Image
          accessibilityLabel="Full step photo"
          source={{ uri }}
          style={styles.viewerImage}
          resizeMode="contain"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          onPress={onClose}
          style={[styles.viewerClose, { top: insets.top + spacing.md }]}
        >
          <Ionicons name="close" size={26} color={colors.onPrimary} />
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Step card ────────────────────────────────────────────────────────────────

interface StepCardProps {
  taskId: string;
  step: TaskStep;
  index: number;
  /** Whether this step currently holds the (single) playback slot. */
  isActive: boolean;
  /** Claim the playback slot — stops whatever other step was playing. */
  onActivate: (stepId: string) => void;
  /** Release the slot, but only if this step still owns it. */
  onDeactivate: (stepId: string) => void;
}

function StepCard({ taskId, step, index, isActive, onActivate, onDeactivate }: StepCardProps) {
  // A step can carry one visual (IMAGE or VIDEO) and, independently, one AUDIO
  // recording — so resolve each slot on its own rather than just taking [0].
  const visual = useMemo(
    () => step.mediaAssets.find((a) => a.type === 'IMAGE' || a.type === 'VIDEO'),
    [step.mediaAssets],
  );
  const audio = useMemo(
    () => step.mediaAssets.find((a) => a.type === 'AUDIO'),
    [step.mediaAssets],
  );

  const visualQuery = useMediaDownloadUrl(taskId, visual?.assetId ?? '');
  const audioQuery = useMediaDownloadUrl(taskId, audio?.assetId ?? '');
  const visualUri = visualQuery.data?.downloadUrl ?? null;
  const audioUri = audioQuery.data?.downloadUrl ?? null;

  const isImage = visual?.type === 'IMAGE';
  const isVideo = visual?.type === 'VIDEO';
  const hasAudio = Boolean(audio);

  const videoPlayer = useVideoPlayer(isVideo ? visualUri : null, (player) => {
    player.loop = false;
  });
  const [videoStarted, setVideoStarted] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);

  // One audio player per step, shared by the row speaker, the photo overlay and
  // the audio bar so every control reflects the exact same playback state.
  const audioPlayer = useAudioPlayer(audioUri);
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  // Text-to-speech fallback for steps that have no recording.
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Single source of truth both speaker controls render from.
  const isPlaying = hasAudio ? audioStatus.playing : isSpeaking;
  const audioProgress =
    audioStatus.duration > 0 ? Math.min(audioStatus.currentTime / audioStatus.duration, 1) : 0;
  // The audio bar (progress UI) is only useful when there's no photo to host the
  // overlay control — i.e. audio-only steps or audio paired with a video.
  const showAudioBar = hasAudio && !isImage;

  // Loop a finished recording back to the start and release the playback slot.
  useEffect(() => {
    if (!audioStatus.didJustFinish) return;
    try {
      void audioPlayer.seekTo(0);
    } catch {
      // Player released between the status update and this effect — safe to ignore.
    }
    onDeactivate(step.stepId);
  }, [audioStatus.didJustFinish, audioPlayer, onDeactivate, step.stepId]);

  // When another step takes the slot, make sure this one falls silent.
  useEffect(() => {
    if (isActive) return;
    if (hasAudio) {
      audioPlayer.pause();
    } else if (isSpeaking) {
      void Speech.stop();
      setIsSpeaking(false);
    }
  }, [isActive, hasAudio, isSpeaking, audioPlayer]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      if (hasAudio) audioPlayer.pause();
      else {
        void Speech.stop();
        setIsSpeaking(false);
      }
      onDeactivate(step.stepId);
      return;
    }
    // Claim the slot first so any other playing step stops.
    onActivate(step.stepId);
    if (hasAudio) {
      if (!audioUri) return; // recording URL still loading
      audioPlayer.play();
    } else {
      void Speech.stop();
      setIsSpeaking(true);
      Speech.speak(`Step ${index + 1}. ${step.text}`, {
        onDone: () => {
          setIsSpeaking(false);
          onDeactivate(step.stepId);
        },
        onStopped: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          onDeactivate(step.stepId);
        },
      });
    }
  }, [isPlaying, hasAudio, audioPlayer, audioUri, onActivate, onDeactivate, step.stepId, step.text, index]);

  return (
    <View style={styles.stepCard}>
      {/* Media preview */}
      {isImage ? (
        visualUri ? (
          <View style={styles.mediaWrap}>
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={`View ${step.text} photo full screen`}
              onPress={() => setPhotoVisible(true)}
            >
              <Image
                accessibilityLabel={`${step.text} photo`}
                source={{ uri: visualUri }}
                style={styles.stepMedia}
                resizeMode="cover"
              />
            </Pressable>
            {/* Overlay speaker — same playback + state as the row speaker. */}
            {hasAudio ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Stop step audio' : 'Play step audio'}
                accessibilityState={{ selected: isPlaying }}
                onPress={togglePlayback}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.audioOverlay,
                  isPlaying ? styles.audioOverlayActive : styles.audioOverlayIdle,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Ionicons name="volume-high" size={16} color={colors.onPrimary} />
                {isPlaying ? <Text style={styles.audioOverlayText}>Playing</Text> : null}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={[styles.stepMedia, styles.mediaPlaceholder]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )
      ) : null}

      {isImage && visualUri ? (
        <PhotoViewer uri={visualUri} visible={photoVisible} onClose={() => setPhotoVisible(false)} />
      ) : null}

      {isVideo ? (
        visualUri ? (
          <View style={styles.stepMedia}>
            <VideoView
              accessibilityLabel={`${step.text} video`}
              player={videoPlayer}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls
            />
            {videoStarted ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Play ${step.text} video`}
                onPress={() => {
                  videoPlayer.play();
                  setVideoStarted(true);
                }}
                style={styles.videoPlayOverlay}
              >
                <View style={styles.videoPlayCircle}>
                  <Ionicons name="play" size={30} color={colors.onPrimary} style={{ marginLeft: 4 }} />
                </View>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={[styles.stepMedia, styles.mediaPlaceholder]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )
      ) : null}

      {showAudioBar ? (
        <View style={styles.audioWrap}>
          <View style={styles.audioBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
              disabled={!audioUri}
              onPress={togglePlayback}
              style={({ pressed }) => [styles.audioPlayBtn, pressed ? styles.pressed : null]}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={colors.onPrimary}
                style={isPlaying ? undefined : { marginLeft: 2 }}
              />
            </Pressable>
            <View style={styles.audioBarInfo}>
              <Text style={styles.audioBarLabel}>Audio note</Text>
              <View style={styles.audioTrack}>
                <View style={[styles.audioTrackFill, { width: `${audioProgress * 100}%` }]} />
              </View>
            </View>
            <Ionicons name="mic" size={18} color={TEAL} />
          </View>
        </View>
      ) : null}

      {/* Title row */}
      <View style={styles.stepRow}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.stepTitle}>{step.text}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isPlaying
              ? hasAudio
                ? 'Stop step audio'
                : 'Stop reading step'
              : hasAudio
                ? 'Play step audio'
                : 'Listen to step'
          }
          accessibilityState={{ selected: isPlaying }}
          onPress={togglePlayback}
          style={({ pressed }) => [
            styles.listenButton,
            isPlaying ? styles.listenButtonActive : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons
            name={isPlaying ? (hasAudio ? 'pause' : 'stop') : 'volume-high'}
            size={18}
            color={isPlaying ? colors.onPrimary : colors.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TaskViewScreen() {
  const navigation = useNavigation<TaskViewNavigation>();
  const route = useRoute<TaskViewRoute>();
  const insets = useSafeAreaInsets();
  const simpleMode = useSimpleMode();
  const { taskId } = route.params;

  const taskQuery = useTask(taskId);
  const stepsQuery = useTaskSteps(taskId);

  // The single step allowed to play at a time (audio recording or TTS).
  const [activeStepId, setActiveStepId] = useState<string>();

  const steps = useMemo(
    () =>
      [...(stepsQuery.data?.pages.flatMap((page) => page.items) ?? [])].sort(
        (a, b) => a.order - b.order,
      ),
    [stepsQuery.data],
  );

  // Allow playback through the iOS silent switch, and stop any in-flight speech
  // when leaving the screen.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
    return () => {
      void Speech.stop();
    };
  }, []);

  const activateStep = useCallback((stepId: string) => setActiveStepId(stepId), []);
  const deactivateStep = useCallback(
    (stepId: string) => setActiveStepId((current) => (current === stepId ? undefined : current)),
    [],
  );

  const stepCount = steps.length;
  const isLoading = taskQuery.isLoading || stepsQuery.isLoading;
  const error = taskQuery.error?.message;

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading task…</Text>
      </View>
    );
  }

  if (error || !taskQuery.data) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="alert-circle" size={36} color={colors.danger} />
        <Text accessibilityRole="alert" style={styles.stateText}>
          {error ?? 'This task could not be found.'}
        </Text>
        <BackButton onPress={() => navigation.goBack()} variant="dark" />
      </View>
    );
  }

  const task = taskQuery.data;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} variant="dark" />
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={styles.headerTitle}
        >
          {task.title}
        </Text>
        {/* Simple Mode hides the details/edit menu — viewing steps only. */}
        {simpleMode ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open task details"
            onPress={() => navigation.navigate('TaskDetail', { taskId })}
            style={({ pressed }) => [styles.menuButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {stepCount === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyTitle}>No steps yet</Text>
            <Text style={styles.emptyText}>This task doesn’t have any steps.</Text>
          </View>
        ) : (
          <View style={styles.stepList}>
            {steps.map((step, index) => (
              <StepCard
                key={step.stepId}
                taskId={taskId}
                step={step}
                index={index}
                isActive={activeStepId === step.stepId}
                onActivate={activateStep}
                onDeactivate={deactivateStep}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    flex: 1,
    ...typography.title,
    color: colors.text,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  emptyState: {
    minHeight: 220,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  stepList: {
    gap: spacing.lg,
  },
  stepCard: {
    overflow: 'hidden',
    borderRadius: radius.lg + spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  mediaWrap: {
    position: 'relative',
  },
  stepMedia: {
    width: '100%',
    height: 190,
    backgroundColor: '#000',
  },
  // Translucent speaker pill over a step photo (top-left). Two states keep it in
  // sync with the row speaker: idle (dark, icon only) vs playing (accent + label).
  audioOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    opacity: 0.8,
  },
  audioOverlayIdle: {
    backgroundColor: 'rgba(27,34,48,0.65)',
  },
  audioOverlayActive: {
    backgroundColor: colors.primary,
  },
  audioOverlayText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
    color: colors.onPrimary,
  },
  mediaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  videoPlayCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerClose: {
    position: 'absolute',
    right: spacing.xl,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  audioWrap: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  audioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: TEAL_LIGHT,
  },
  audioPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBarInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  audioBarLabel: {
    ...typography.caption,
    fontWeight: '700',
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  stepNumberText: {
    ...typography.bodyStrong,
    fontSize: 18,
    color: colors.onPrimary,
  },
  stepTitle: {
    flex: 1,
    ...typography.heading,
    color: colors.text,
  },
  listenButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEDE8',
  },
  listenButtonActive: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
