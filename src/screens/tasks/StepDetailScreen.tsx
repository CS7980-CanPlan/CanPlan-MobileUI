import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  occurrenceKey,
  toggleOccurrenceStep,
  useCompletedSteps,
} from '../../features/assignments/occurrenceCompletion';
import { useCachedMediaUri } from '../../features/media/hooks/useCachedMedia';
import { useTask } from '../../features/tasks/hooks/useTask';
import { useTaskSteps } from '../../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../../navigation/types';
import CachedImage from '../../shared/components/CachedImage';
import { colors, radius, shadow, spacing, typography } from '../../shared/theme/tokens';

type StepDetailNavigation = NativeStackNavigationProp<MainStackParamList, 'StepDetail'>;
type StepDetailRoute = RouteProp<MainStackParamList, 'StepDetail'>;

export default function StepDetailScreen() {
  const navigation = useNavigation<StepDetailNavigation>();
  const route = useRoute<StepDetailRoute>();
  const insets = useSafeAreaInsets();
  const { taskId, stepId, assignmentId, scheduledDate, scheduledTime } = route.params;

  const isInstance = Boolean(assignmentId && scheduledDate && scheduledTime);
  const occKey =
    assignmentId && scheduledDate && scheduledTime
      ? occurrenceKey(assignmentId, scheduledDate, scheduledTime)
      : '';
  const completedSteps = useCompletedSteps(occKey);
  const completed = completedSteps.has(stepId);

  const taskQuery = useTask(taskId);
  const stepsQuery = useTaskSteps(taskId);

  const steps = useMemo(
    () =>
      [...(stepsQuery.data?.pages.flatMap((page) => page.items) ?? [])].sort(
        (a, b) => a.order - b.order,
      ),
    [stepsQuery.data],
  );
  const index = steps.findIndex((s) => s.stepId === stepId);
  const step = index >= 0 ? steps[index] : undefined;

  const visual = useMemo(
    () => step?.mediaAssets.find((a) => a.type === 'IMAGE'),
    [step],
  );
  const audio = useMemo(
    () => step?.mediaAssets.find((a) => a.type === 'AUDIO'),
    [step],
  );
  const visualUri = useCachedMediaUri(taskId, visual);
  const audioUri = useCachedMediaUri(taskId, audio);
  const hasAudio = Boolean(audio);

  const audioPlayer = useAudioPlayer(audioUri);
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isPlaying = hasAudio ? audioStatus.playing : isSpeaking;

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
    return () => {
      void Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (audioStatus.didJustFinish) {
      try {
        void audioPlayer.seekTo(0);
      } catch {
        // player released — ignore
      }
    }
  }, [audioStatus.didJustFinish, audioPlayer]);

  const togglePlayback = useCallback(() => {
    if (!step) {
      return;
    }
    if (isPlaying) {
      if (hasAudio) {
        audioPlayer.pause();
      } else {
        void Speech.stop();
        setIsSpeaking(false);
      }
      return;
    }
    if (hasAudio) {
      if (!audioUri) {
        return;
      }
      audioPlayer.play();
    } else {
      void Speech.stop();
      setIsSpeaking(true);
      Speech.speak(`Step ${index + 1}. ${step.text}`, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  }, [step, isPlaying, hasAudio, audioPlayer, audioUri, index]);

  const isLoading = taskQuery.isLoading || stepsQuery.isLoading;

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!step || !taskQuery.data) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateText}>This step could not be found.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="All steps"
          onPress={() => navigation.goBack()}
          style={styles.backPill}
        >
          <Ionicons name="arrow-back" size={18} color={colors.onPrimary} />
          <Text style={styles.backPillText}>All steps</Text>
        </Pressable>
      </View>
    );
  }

  const task = taskQuery.data;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {visualUri ? (
            <CachedImage
              accessibilityLabel={`${step.text} photo`}
              uri={visualUri}
              cacheKey={visual?.assetId ?? ''}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]}>
              <Ionicons name="image-outline" size={40} color={colors.disabled} />
            </View>
          )}
          <View style={[styles.heroTopRow, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="All steps"
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backPill, pressed ? styles.pressed : null]}
            >
              <Ionicons name="arrow-back" size={18} color={colors.onPrimary} />
              <Text style={styles.backPillText}>All steps</Text>
            </Pressable>
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>
                {index + 1} / {steps.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.taskCaption}>{task.title.toUpperCase()}</Text>
          <Text style={styles.stepHeading}>Step {index + 1}</Text>
          <Text style={styles.stepText}>{step.text}</Text>
          {step.description ? <Text style={styles.stepDescription}>{step.description}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Stop' : 'Listen to this step'}
            accessibilityState={{ selected: isPlaying }}
            onPress={togglePlayback}
            style={({ pressed }) => [styles.listenButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name={isPlaying ? 'stop' : 'volume-high'} size={20} color={colors.primary} />
            <Text style={styles.listenText}>{isPlaying ? 'Stop' : 'Listen to this step'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {isInstance ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={completed ? 'Mark step not done' : 'Mark step done'}
          onPress={() => occKey && toggleOccurrenceStep(occKey, stepId)}
          style={({ pressed }) => [
            styles.doneButton,
            completed ? styles.undoButton : styles.markDoneButton,
            { marginBottom: insets.bottom + spacing.lg },
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons
            name={completed ? 'arrow-undo' : 'checkmark'}
            size={20}
            color={completed ? colors.danger : colors.onPrimary}
          />
          <Text style={[styles.doneText, completed ? styles.undoText : styles.markDoneText]}>
            {completed ? 'Undo — not done yet' : 'Mark as done'}
          </Text>
        </Pressable>
      ) : null}
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
    gap: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
  },
  hero: {
    width: '100%',
    height: 360,
    backgroundColor: '#000',
  },
  heroPlaceholder: {
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(27,34,48,0.55)',
  },
  backPillText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
  },
  counterPill: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27,34,48,0.55)',
  },
  counterText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  taskCaption: {
    ...typography.caption,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  stepHeading: {
    ...typography.title,
    color: colors.text,
    marginTop: spacing.sm,
  },
  stepText: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.sm,
  },
  stepDescription: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: '#FDEDE8',
    marginTop: spacing.xl,
  },
  listenText: {
    ...typography.button,
    color: colors.primary,
  },
  doneButton: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  markDoneButton: {
    backgroundColor: colors.primary,
  },
  undoButton: {
    backgroundColor: '#FDE7E7',
  },
  doneText: {
    ...typography.button,
  },
  markDoneText: {
    color: colors.onPrimary,
  },
  undoText: {
    color: colors.danger,
  },
  pressed: {
    opacity: 0.72,
  },
});
