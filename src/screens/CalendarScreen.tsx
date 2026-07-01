import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useAssignmentsForUser,
  useTaskInstanceViews,
} from '../features/assignments/hooks/useAssignments';
import {
  occurrenceState,
  useSeriesActiveDates,
  type OccurrenceLifeState,
} from '../features/assignments/hooks/useSeriesActiveDates';
import {
  occurrenceKey,
  useCompletedSteps,
  useOccurrenceStatuses,
} from '../features/assignments/occurrenceCompletion';
import { describeRepeat } from '../features/assignments/repeat';
import { useMediaDownloadUrl } from '../features/media/hooks/useMedia';
import { useTasksByOwner, useTaskSteps } from '../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../navigation/types';
import { getCurrentUserId } from '../shared/api/authTokenProvider';
import type {
  TaskAssignment,
  TaskInstanceStatus,
  TaskInstanceView,
} from '../shared/api/canplanTypes';
import BackButton from '../shared/components/BackButton';
import CachedImage from '../shared/components/CachedImage';
import { colors, radius, shadow, spacing, typography } from '../shared/theme/tokens';

type CalendarNavigation = NativeStackNavigationProp<MainStackParamList, 'Calendar'>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type StatusKey = 'overdue' | 'todo' | 'done' | 'skipped';

const STATUS_TABS: Array<{ key: StatusKey; label: string }> = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'todo', label: 'To Do' },
  { key: 'done', label: 'Done' },
  { key: 'skipped', label: 'Skipped' },
];

const STATUS_ACCENT: Record<StatusKey, string> = {
  overdue: colors.danger,
  todo: colors.primary,
  done: colors.success,
  skipped: colors.disabled,
};

const STATUS_LABEL: Record<StatusKey, string> = {
  overdue: 'Overdue',
  todo: 'To Do',
  done: 'Done',
  skipped: 'Skipped',
};

/** Map a server status onto one of the four calendar buckets (CANCELLED is dropped). */
function bucketOf(status: TaskInstanceStatus): StatusKey | null {
  switch (status) {
    case 'OVERDUE':
      return 'overdue';
    case 'TO_DO':
    case 'IN_PROGRESS':
      return 'todo';
    case 'COMPLETED':
      return 'done';
    case 'SKIPPED':
      return 'skipped';
    default:
      return null;
  }
}

// ── Date helpers (local, not UTC) ──────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
/** Hour → slot range, e.g. 20 → "20:00 - 21:00", 23 → "23:00 - 00:00". */
const slotLabel = (hour: number) => `${pad2(hour)}:00 - ${pad2((hour + 1) % 24)}:00`;
/** "2026-07-02" → "Thu, Jul 2". */
const formatShortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// ── A task's cover image, resolved from its asset id ───────────────────────────

function TaskCover({
  taskId,
  assetId,
  style,
  iconSize = 32,
  dimmed = false,
}: {
  taskId: string;
  assetId?: string | null;
  style: object;
  iconSize?: number;
  dimmed?: boolean;
}) {
  // Hook must run unconditionally; it self-disables when there is no asset id.
  const download = useMediaDownloadUrl(taskId, assetId ?? '');
  return (
    <View style={[style, styles.coverPlaceholder, dimmed ? styles.coverDimmed : null]}>
      <Ionicons name="image-outline" size={iconSize} color={colors.disabled} />
      {assetId ? (
        <CachedImage
          uri={download.data?.downloadUrl ?? null}
          cacheKey={assetId}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}

// ── WeChat-style thumbnail collage for a calendar day (up to 9 covers) ─────────

const THUMB_SIZE = 48;

/** One distinct task cover in a day's collage, plus whether it's not yet materialized. */
type DayThumbItem = { taskId: string; gray: boolean };

function DayThumbGrid({
  items,
  coverByTask,
}: {
  items: DayThumbItem[];
  coverByTask: Map<string, string | null | undefined>;
}) {
  // Each cover gets its own equal square tile (WeChat-group-avatar style) so
  // covers show in full rather than being stretched into tall side-by-side
  // strips. Partial rows are centered by the container's justify/alignContent.
  const cols = items.length <= 1 ? 1 : items.length <= 4 ? 2 : 3;
  const tile = Math.floor(THUMB_SIZE / cols);
  return (
    <View style={styles.monthThumb}>
      {items.map(({ taskId, gray }, index) => (
        <View key={`${taskId}-${index}`} style={{ width: tile, height: tile }}>
          <TaskCover
            taskId={taskId}
            assetId={coverByTask.get(taskId)}
            style={StyleSheet.absoluteFill}
            iconSize={10}
          />
          {/* Not-yet-materialized days read as grey; materialized show in colour. */}
          {gray ? <View style={styles.thumbGrayVeil} pointerEvents="none" /> : null}
        </View>
      ))}
    </View>
  );
}

// ── Assignment card ────────────────────────────────────────────────────────────

function AssignmentCard({
  view,
  bucket,
  coverAssetId,
  state,
  isRecurring,
  repeatLabel,
  onPress,
}: {
  view: TaskInstanceView;
  bucket: StatusKey;
  coverAssetId?: string | null;
  state: OccurrenceLifeState;
  isRecurring: boolean;
  /** Recurrence type (e.g. "Daily") shown next to the time; omitted for one-time. */
  repeatLabel?: string;
  onPress: () => void;
}) {
  // "Gray" occurrences (projected days after the active one) are inert: dimmed
  // and not tappable. Completed/skipped ones read as done (strikethrough title).
  const isGray = state === 'gray';
  const isDone = bucket === 'done' || bucket === 'skipped';
  // Step completion progress is what distinguishes an assignment occurrence from
  // a plain task: total comes from the real task steps, done from the (UI-only)
  // occurrence completion store.
  const stepsQuery = useTaskSteps(view.taskId);
  const totalSteps = stepsQuery.data?.pages.reduce((sum, page) => sum + page.items.length, 0) ?? 0;
  const completed = useCompletedSteps(
    occurrenceKey(view.assignmentId, view.scheduledDate, view.scheduledTime),
  );
  const doneSteps = stepsQuery.data
    ? (stepsQuery.data.pages.flatMap((page) => page.items).filter((s) => completed.has(s.stepId))
        .length)
    : 0;

  // Title + time/repeat + steps — shared by both layouts.
  const textBlock = (
    <View style={styles.taskTextWrap}>
      <Text
        style={[
          styles.taskTitle,
          isDone ? styles.taskTitleDone : isGray ? styles.taskTitleFuture : null,
        ]}
      >
        {view.title}
      </Text>
      <View style={styles.taskMetaRow}>
        {isRecurring ? (
          <Ionicons
            name="repeat"
            size={14}
            color={isGray ? colors.disabled : colors.textMuted}
            accessibilityLabel="Repeats"
          />
        ) : null}
        <Text style={[styles.taskMeta, styles.taskMetaInline]}>
          {repeatLabel ? `${view.scheduledTime} · ${repeatLabel}` : view.scheduledTime}
        </Text>
      </View>
      <Text style={styles.taskMeta}>
        {doneSteps}/{totalSteps} steps
      </Text>
    </View>
  );

  const statusTag = (
    <View style={[styles.statusTag, { backgroundColor: STATUS_ACCENT[bucket] }]}>
      <Text style={styles.statusTagText}>{STATUS_LABEL[bucket]}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${view.title}, ${view.scheduledTime}, ${doneSteps} of ${totalSteps} steps${
        isGray ? ', not active yet' : ''
      }`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.taskCard,
        isGray ? styles.taskCardGray : null,
        pressed ? styles.taskCardPressed : null,
      ]}
    >
      {isGray ? (
        // Not-yet-materialized: a compact row with the cover as a left thumbnail.
        <View style={styles.grayRow}>
          <TaskCover taskId={view.taskId} assetId={coverAssetId} style={styles.grayThumb} iconSize={20} />
          {textBlock}
          {statusTag}
          <Ionicons name="information-circle-outline" size={24} color={colors.disabled} />
        </View>
      ) : (
        // Materialized: the full-width cover photo on top of the detail row.
        <>
          <TaskCover taskId={view.taskId} assetId={coverAssetId} style={styles.taskImage} />
          <View style={styles.taskBody}>
            <View style={[styles.taskAccent, { backgroundColor: STATUS_ACCENT[bucket] }]} />
            {textBlock}
            {statusTag}
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </View>
        </>
      )}
    </Pressable>
  );
}

// ── Month picker modal (opened from the eye icon) ──────────────────────────────

function MonthPickerModal({
  visible,
  ownerId,
  initialDate,
  coverByTask,
  activeDates,
  today,
  onClose,
  onSelectDay,
}: {
  visible: boolean;
  ownerId: string;
  initialDate: Date;
  coverByTask: Map<string, string | null | undefined>;
  activeDates: ReadonlyMap<string, string>;
  today: Date;
  onClose: () => void;
  onSelectDay: (date: Date) => void;
}) {
  const insets = useSafeAreaInsets();
  const statusOverrides = useOccurrenceStatuses();
  const [viewDate, setViewDate] = useState(initialDate);

  // Re-sync to the current selection whenever the sheet is reopened.
  useEffect(() => {
    if (visible) {
      setViewDate(initialDate);
    }
  }, [visible, initialDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthStart = useMemo(() => new Date(year, month, 1), [year, month]);
  const monthEnd = useMemo(() => new Date(year, month + 1, 0), [year, month]);

  const viewsQuery = useTaskInstanceViews(
    visible ? ownerId : '',
    toISODate(monthStart),
    toISODate(monthEnd),
  );

  // date string → up to 9 distinct task covers scheduled that day, each flagged
  // gray when that day's occurrence isn't materialized yet. A materialized
  // occurrence of the same task wins (color) over a gray one.
  const tasksByDate = useMemo(() => {
    const todayISO = toISODate(today);
    const byDate = new Map<string, Map<string, boolean>>();
    for (const v of viewsQuery.data?.items ?? []) {
      let covers = byDate.get(v.scheduledDate);
      if (!covers) {
        covers = new Map<string, boolean>();
        byDate.set(v.scheduledDate, covers);
      }
      const override = statusOverrides.get(
        occurrenceKey(v.assignmentId, v.scheduledDate, v.scheduledTime),
      );
      const gray =
        occurrenceState({
          scheduledDate: v.scheduledDate,
          status: override ?? v.status,
          activeDate: activeDates.get(v.assignmentId),
          todayISO,
        }) === 'gray';
      if (covers.has(v.taskId)) {
        if (!gray) {
          covers.set(v.taskId, false);
        }
      } else if (covers.size < 9) {
        covers.set(v.taskId, gray);
      }
    }
    const result = new Map<string, DayThumbItem[]>();
    for (const [date, covers] of byDate) {
      result.set(
        date,
        [...covers.entries()].map(([taskId, gray]) => ({ taskId, gray })),
      );
    }
    return result;
  }, [viewsQuery.data, statusOverrides, activeDates, today]);

  const cells = useMemo<Array<number | null>>(() => {
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    return [
      ...Array<null>(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  }, [monthStart, monthEnd]);

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
          >
            <Text style={styles.modalCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Calendar</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        <View style={styles.monthNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => setViewDate(new Date(year, month - 1, 1))}
            style={({ pressed }) => [styles.monthArrow, pressed ? styles.chipPressed : null]}
            hitSlop={6}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => setViewDate(new Date(year, month + 1, 1))}
            style={({ pressed }) => [styles.monthArrow, pressed ? styles.chipPressed : null]}
            hitSlop={6}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayLabel}>
              {day}
            </Text>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.modalGridContent}>
          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={styles.monthCell} />;
              }
              const date = new Date(year, month, day);
              const iso = toISODate(date);
              const dayItems = tasksByDate.get(iso) ?? [];
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={date.toDateString()}
                  onPress={() => onSelectDay(date)}
                  style={styles.monthCell}
                >
                  {dayItems.length > 0 ? (
                    <DayThumbGrid items={dayItems} coverByTask={coverByTask} />
                  ) : null}
                  <Text
                    style={[
                      styles.monthDayText,
                      dayItems.length > 0 ? styles.monthDayTextOnImage : null,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── One swipeable day page (its own list + data) ───────────────────────────────

function DayAssignmentsPage({
  date,
  width,
  height,
  ownerId,
  activeStatus,
  coverByTask,
  assignmentById,
  activeDates,
  today,
  bottomPadding,
  onOpen,
}: {
  date: Date;
  width: number;
  height: number;
  ownerId: string;
  activeStatus: StatusKey;
  coverByTask: Map<string, string | null | undefined>;
  assignmentById: ReadonlyMap<string, TaskAssignment>;
  activeDates: ReadonlyMap<string, string>;
  today: Date;
  bottomPadding: number;
  onOpen: (view: TaskInstanceView) => void;
}) {
  const iso = toISODate(date);
  const viewsQuery = useTaskInstanceViews(ownerId, iso, iso);
  const statusOverrides = useOccurrenceStatuses();

  const views = useMemo(() => {
    const result: TaskInstanceView[] = [];
    for (const view of viewsQuery.data?.items ?? []) {
      const override = statusOverrides.get(
        occurrenceKey(view.assignmentId, view.scheduledDate, view.scheduledTime),
      );
      if (bucketOf(override ?? view.status) === activeStatus) {
        result.push(view);
      }
    }
    return result;
  }, [viewsQuery.data, statusOverrides, activeStatus]);

  // Group the day's occurrences into hour slots (20:00 → "20:00 - 21:00") so
  // times read as ranges under prominent slot headers.
  const groups = useMemo(() => {
    const byHour = new Map<number, TaskInstanceView[]>();
    for (const view of views) {
      const hour = Number(view.scheduledTime.split(':')[0]) || 0;
      const list = byHour.get(hour);
      if (list) {
        list.push(view);
      } else {
        byHour.set(hour, [view]);
      }
    }
    return [...byHour.entries()].sort((a, b) => a[0] - b[0]);
  }, [views]);

  const isLoading = viewsQuery.isLoading || !ownerId;
  const todayISO = toISODate(today);

  return (
    <ScrollView
      style={{ width, height: height || undefined }}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : viewsQuery.isError ? (
        <Text style={styles.stateText}>Could not load this day’s tasks.</Text>
      ) : views.length === 0 ? (
        <Text style={styles.stateText}>Nothing here for this day.</Text>
      ) : (
        groups.map(([hour, groupViews]) => (
          <View key={hour} style={styles.slotGroup}>
            <Text style={styles.slotHeader}>{slotLabel(hour)}</Text>
            {groupViews.map((view) => {
              const override = statusOverrides.get(
                occurrenceKey(view.assignmentId, view.scheduledDate, view.scheduledTime),
              );
              const assignment = assignmentById.get(view.assignmentId);
              const isRecurring = assignment?.scheduleType === 'RECURRING';
              const activeDate = activeDates.get(view.assignmentId);
              const state = occurrenceState({
                scheduledDate: view.scheduledDate,
                status: override ?? view.status,
                activeDate,
                todayISO,
              });
              // Gray days aren't operable, but tapping explains why and points to
              // the current (most recently materialized) occurrence to act on.
              const handlePress =
                state === 'gray'
                  ? () =>
                      Alert.alert(
                        'Not active yet',
                        activeDate
                          ? `This day hasn’t started in the series yet — it’s not materialized. Open the current task on ${formatShortDate(activeDate)} to delete this or all future occurrences.`
                          : 'This day hasn’t started in the series yet — it’s not materialized. Open the current task to delete this or all future occurrences.',
                      )
                  : () => onOpen(view);
              return (
                <AssignmentCard
                  key={`${view.assignmentId}-${view.scheduledFor}`}
                  view={view}
                  bucket={activeStatus}
                  coverAssetId={coverByTask.get(view.taskId)}
                  state={state}
                  isRecurring={isRecurring}
                  repeatLabel={isRecurring ? describeRepeat(assignment) : undefined}
                  onPress={handlePress}
                />
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

export default function CalendarScreen() {
  const navigation = useNavigation<CalendarNavigation>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [ownerId, setOwnerId] = useState('');
  const [selected, setSelected] = useState(() => new Date());
  const [activeStatus, setActiveStatus] = useState<StatusKey>('todo');
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [addChoiceVisible, setAddChoiceVisible] = useState(false);
  const [pagerHeight, setPagerHeight] = useState(0);

  useEffect(() => {
    let mounted = true;
    void getCurrentUserId().then((id) => {
      if (mounted) {
        setOwnerId(id);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const selectedISO = toISODate(selected);

  const dayViewsQuery = useTaskInstanceViews(ownerId, selectedISO, selectedISO);
  const tasksQuery = useTasksByOwner(ownerId);
  const assignmentsQuery = useAssignmentsForUser(ownerId);

  // assignmentId → its assignment, for the card's repeat icon + type label.
  const assignmentById = useMemo(() => {
    const map = new Map<string, TaskAssignment>();
    for (const page of assignmentsQuery.data?.pages ?? []) {
      for (const assignment of page.items) {
        map.set(assignment.assignmentId, assignment);
      }
    }
    return map;
  }, [assignmentsQuery.data]);

  // assignmentId → the series' current active occurrence date (earliest
  // uncompleted on/after today). Drives the three-state visual + delete rules.
  const activeDates = useSeriesActiveDates(ownerId);

  // taskId → cover asset id, used by both the cards and the month thumbnails.
  const coverByTask = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    for (const page of tasksQuery.data?.pages ?? []) {
      for (const task of page.items) {
        map.set(task.taskId, task.coverImageAssetId);
      }
    }
    return map;
  }, [tasksQuery.data]);

  // UI-only status overrides (mark done / skip from the runner) win over the
  // server status so the occurrence moves buckets within the session.
  const statusOverrides = useOccurrenceStatuses();
  const buckets = useMemo(() => {
    const result: Record<StatusKey, TaskInstanceView[]> = {
      overdue: [],
      todo: [],
      done: [],
      skipped: [],
    };
    for (const view of dayViewsQuery.data?.items ?? []) {
      const override = statusOverrides.get(
        occurrenceKey(view.assignmentId, view.scheduledDate, view.scheduledTime),
      );
      const key = bucketOf(override ?? view.status);
      if (key) {
        result[key].push(view);
      }
    }
    return result;
  }, [dayViewsQuery.data, statusOverrides]);

  // Horizontal pager: three pages [prev, selected, next]. Swiping snaps like the
  // iOS home screen; on settle we update `selected` and silently recenter.
  const pagerRef = useRef<FlatList<Date>>(null);
  const pages = useMemo(() => [-1, 0, 1].map((offset) => addDays(selected, offset)), [selected]);

  // Whenever the selected day changes (swipe settle OR week-strip tap), snap back
  // to the centre page so there's always a prev/next to swipe to.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      pagerRef.current?.scrollToOffset({ offset: width, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [selected, width]);

  const handlePagerSettle = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(event.nativeEvent.contentOffset.x / width);
      if (page !== 1) {
        setSelected((current) => addDays(current, page - 1));
      }
    },
    [width],
  );

  const openOccurrence = useCallback(
    (view: TaskInstanceView) => {
      // Future occurrences are preview-only → occurrence detail. Today/past open
      // the step "runner" (TaskView in instance mode).
      if (view.scheduledDate > toISODate(today)) {
        navigation.navigate('OccurrenceDetail', {
          assignmentId: view.assignmentId,
          taskId: view.taskId,
          taskTitle: view.title,
          scheduledDate: view.scheduledDate,
          scheduledTime: view.scheduledTime,
          status: view.status,
          isVirtual: view.isVirtual,
        });
      } else {
        navigation.navigate('TaskView', {
          taskId: view.taskId,
          assignmentId: view.assignmentId,
          scheduledDate: view.scheduledDate,
          scheduledTime: view.scheduledTime,
          instanceId: view.instanceId ?? undefined,
          status: view.status,
        });
      }
    },
    [navigation, today],
  );

  const weekStart = useMemo(() => startOfWeek(selected), [selected]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.topArea, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} variant="dark" />
          <Text accessibilityRole="header" style={styles.headerTitle}>
            Calendar
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open month calendar"
            onPress={() => setMonthPickerVisible(true)}
            style={({ pressed }) => [styles.eyeButton, pressed ? styles.chipPressed : null]}
            hitSlop={6}
          >
            <Ionicons name="eye-outline" size={24} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a task"
            onPress={() => setAddChoiceVisible(true)}
            style={({ pressed }) => [styles.addButton, pressed ? styles.addButtonPressed : null]}
          >
            <Ionicons name="add" size={30} color={colors.onPrimary} />
          </Pressable>
        </View>

        <View style={styles.weekStrip}>
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selected);
            const highlightColor = isSameDay(day, today) ? colors.danger : colors.text;
            return (
              <Pressable
                key={day.toISOString()}
                accessibilityRole="button"
                accessibilityLabel={day.toDateString()}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelected(day)}
                style={styles.weekCell}
              >
                <Text style={styles.weekCellWeekday}>{WEEKDAYS[day.getDay()]}</Text>
                <View
                  style={[
                    styles.weekCellCircle,
                    isSelected ? { backgroundColor: highlightColor } : null,
                  ]}
                >
                  <Text
                    style={[styles.weekCellDay, isSelected ? styles.weekCellDaySelected : null]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={styles.listWrap}
        onLayout={(event) => setPagerHeight(event.nativeEvent.layout.height)}
      >
        {pagerHeight > 0 ? (
          <FlatList
            ref={pagerRef}
            data={pages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(date) => toISODate(date)}
            initialScrollIndex={1}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={handlePagerSettle}
            renderItem={({ item }) => (
              <DayAssignmentsPage
                date={item}
                width={width}
                height={pagerHeight}
                ownerId={ownerId}
                activeStatus={activeStatus}
                coverByTask={coverByTask}
                assignmentById={assignmentById}
                activeDates={activeDates}
                today={today}
                bottomPadding={insets.bottom + spacing.xxl}
                onOpen={openOccurrence}
              />
            )}
          />
        ) : null}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={`${tab.label}, ${buckets[tab.key].length}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => setActiveStatus(tab.key)}
              style={styles.bottomTab}
            >
              <Text style={[styles.bottomLabel, isActive ? styles.bottomLabelActive : null]}>
                {tab.label}
              </Text>
              <Text style={[styles.bottomCount, isActive ? styles.bottomCountActive : null]}>
                {buckets[tab.key].length}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <MonthPickerModal
        visible={monthPickerVisible}
        ownerId={ownerId}
        initialDate={selected}
        coverByTask={coverByTask}
        activeDates={activeDates}
        today={today}
        onClose={() => setMonthPickerVisible(false)}
        onSelectDay={(date) => {
          setSelected(date);
          setMonthPickerVisible(false);
        }}
      />

      <Modal
        visible={addChoiceVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddChoiceVisible(false)}
      >
        <View style={styles.choiceBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Close"
            onPress={() => setAddChoiceVisible(false)}
          />
          <View style={[styles.choiceSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.choiceTitle}>Add to calendar</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose an existing task"
              onPress={() => {
                setAddChoiceVisible(false);
                navigation.navigate('SelectTask');
              }}
              style={({ pressed }) => [styles.choiceButton, pressed ? styles.choiceButtonPressed : null]}
            >
              <Ionicons name="list-outline" size={22} color={colors.primary} />
              <Text style={styles.choiceButtonText}>Choose an existing task</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start from scratch"
              onPress={() => {
                setAddChoiceVisible(false);
                navigation.navigate('CreateTask', { scheduleAfterCreate: true });
              }}
              style={({ pressed }) => [styles.choiceButton, pressed ? styles.choiceButtonPressed : null]}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.choiceButtonText}>Start from scratch</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topArea: {
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.title,
    color: colors.text,
  },
  eyeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.cardStrong,
  },
  addButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  chipPressed: {
    backgroundColor: colors.border,
  },
  weekStrip: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  weekCellWeekday: {
    ...typography.caption,
    color: colors.textMuted,
  },
  weekCellCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCellDay: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  weekCellDaySelected: {
    color: colors.onPrimary,
  },
  listWrap: {
    flex: 1,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  stateBox: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: spacing.xxl,
  },
  slotGroup: {
    gap: spacing.md,
  },
  slotHeader: {
    ...typography.heading,
    color: colors.text,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  taskCardPressed: {
    opacity: 0.85,
  },
  taskCardGray: {
    opacity: 0.5,
  },
  taskImage: {
    height: 130,
  },
  coverPlaceholder: {
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverDimmed: {
    opacity: 0.4,
  },
  taskBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Compact "not materialized" layout: cover as a left thumbnail.
  grayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    gap: spacing.sm,
  },
  grayThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  taskAccent: {
    width: 6,
    alignSelf: 'stretch',
  },
  taskTextWrap: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  taskTitle: {
    ...typography.heading,
    color: colors.text,
  },
  taskTitleFuture: {
    color: colors.textMuted,
  },
  taskTitleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  taskMetaInline: {
    marginTop: 0,
  },
  statusTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
  },
  statusTagText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  bottomLabel: {
    ...typography.bodyStrong,
    color: colors.textMuted,
  },
  bottomLabelActive: {
    color: colors.primary,
  },
  bottomCount: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  bottomCountActive: {
    color: colors.primary,
  },
  // Month picker modal
  modalRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  modalCancel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text,
  },
  modalHeaderSpacer: {
    width: 54,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...typography.heading,
    fontSize: 22,
    color: colors.text,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    ...typography.caption,
    color: colors.textMuted,
  },
  modalGridContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  monthCell: {
    width: `${100 / 7}%`,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGrayVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(181,175,165,0.72)',
  },
  monthThumb: {
    position: 'absolute',
    top: 4,
    left: '50%',
    marginLeft: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
  },
  monthDayText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  monthDayTextOnImage: {
    color: colors.onPrimary,
  },
  // Add-to-calendar choice sheet
  choiceBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  choiceSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  choiceTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 64,
    ...shadow.card,
  },
  choiceButtonPressed: {
    backgroundColor: colors.surfaceWarm,
  },
  choiceButtonText: {
    ...typography.heading,
    color: colors.text,
  },
});
