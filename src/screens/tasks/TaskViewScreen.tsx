import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
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

// ── Audio player (inline, per-step) ──────────────────────────────────────────

function AudioPlayer({ uri }: { uri: string | null }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    if (!status.didJustFinish) return;
    try {
      void player.seekTo(0);
    } catch {
      // Player released between the status update and this effect — safe to ignore.
    }
  }, [status.didJustFinish, player]);

  const togglePlayback = () => {
    if (!uri) return;
    if (status.playing) player.pause();
    else player.play();
  };

  const progress = status.duration > 0 ? Math.min(status.currentTime / status.duration, 1) : 0;

  return (
    <View style={styles.audioBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause audio' : 'Play audio'}
        disabled={!uri}
        onPress={togglePlayback}
        style={({ pressed }) => [styles.audioPlayBtn, pressed ? styles.pressed : null]}
      >
        <Ionicons
          name={status.playing ? 'pause' : 'play'}
          size={18}
          color={colors.onPrimary}
          style={status.playing ? undefined : { marginLeft: 2 }}
        />
      </Pressable>
      <View style={styles.audioTrack}>
        <View style={[styles.audioTrackFill, { width: `${progress * 100}%` }]} />
      </View>
      <Ionicons name="mic" size={18} color={TEAL} />
    </View>
  );
}

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
  speaking: boolean;
  onListen: () => void;
}

function StepCard({ taskId, step, index, speaking, onListen }: StepCardProps) {
  const media = step.mediaAssets[0];
  const mediaQuery = useMediaDownloadUrl(taskId, media?.assetId ?? '');
  const mediaUri = mediaQuery.data?.downloadUrl ?? null;
  const hasMedia = Boolean(media);
  const isImage = media?.type === 'IMAGE';
  const isVideo = media?.type === 'VIDEO';
  const isAudio = media?.type === 'AUDIO';
  const videoPlayer = useVideoPlayer(isVideo ? mediaUri : null, (player) => {
    player.loop = false;
  });
  const [videoStarted, setVideoStarted] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);

  return (
    <View style={styles.stepCard}>
      {/* Media preview */}
      {hasMedia && isImage ? (
        mediaUri ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={`View ${step.text} photo full screen`}
            onPress={() => setPhotoVisible(true)}
          >
            <Image
              accessibilityLabel={`${step.text} photo`}
              source={{ uri: mediaUri }}
              style={styles.stepMedia}
              resizeMode="cover"
            />
          </Pressable>
        ) : (
          <View style={[styles.stepMedia, styles.mediaPlaceholder]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )
      ) : null}

      {isImage && mediaUri ? (
        <PhotoViewer uri={mediaUri} visible={photoVisible} onClose={() => setPhotoVisible(false)} />
      ) : null}

      {hasMedia && isVideo ? (
        mediaUri ? (
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

      {hasMedia && isAudio ? (
        <View style={styles.audioWrap}>
          <AudioPlayer uri={mediaUri} />
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
          accessibilityLabel={speaking ? 'Stop reading step' : 'Listen to step'}
          onPress={onListen}
          style={({ pressed }) => [
            styles.listenButton,
            speaking ? styles.listenButtonActive : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons
            name={speaking ? 'stop' : 'volume-high'}
            size={18}
            color={speaking ? colors.onPrimary : colors.primary}
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

  const [speakingStepId, setSpeakingStepId] = useState<string>();

  const steps = useMemo(
    () =>
      [...(stepsQuery.data?.pages.flatMap((page) => page.items) ?? [])].sort(
        (a, b) => a.order - b.order,
      ),
    [stepsQuery.data],
  );

  // Stop any in-flight speech when leaving the screen.
  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const handleListen = (step: TaskStep, index: number) => {
    if (speakingStepId === step.stepId) {
      void Speech.stop();
      setSpeakingStepId(undefined);
      return;
    }
    void Speech.stop();
    setSpeakingStepId(step.stepId);
    Speech.speak(`Step ${index + 1}. ${step.text}`, {
      onDone: () => setSpeakingStepId((current) => (current === step.stepId ? undefined : current)),
      onStopped: () => setSpeakingStepId((current) => (current === step.stepId ? undefined : current)),
      onError: () => setSpeakingStepId((current) => (current === step.stepId ? undefined : current)),
    });
  };

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
                speaking={speakingStepId === step.stepId}
                onListen={() => handleListen(step, index)}
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
  stepMedia: {
    width: '100%',
    height: 190,
    backgroundColor: '#000',
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
  audioTrack: {
    flex: 1,
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
