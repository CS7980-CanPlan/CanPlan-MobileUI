import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
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
  useCreateTask,
  useCreateTaskStep,
  useTaskSteps,
  useUpdateTask,
  useUpdateTaskStep,
} from '../features/tasks/hooks/useTaskApi';
import {
  useCreateMediaAsset,
  useCreateMediaUploadUrl,
  useCreateTaskCoverImageUploadUrl,
  useMediaDownloadUrl,
} from '../features/media/hooks/useMedia';
import { useTask } from '../features/tasks/hooks/useTask';
import { useCategoriesByOwner } from '../features/categories/hooks/useCategories';
import type { MainStackParamList } from '../navigation/types';
import { getCurrentUserId } from '../shared/api/authTokenProvider';
import type { Category, RepeatUnit, TaskScheduleInput } from '../shared/api/canplanTypes';
import BackButton from '../shared/components/BackButton';
import { colors, radius, shadow, spacing, typography } from '../shared/theme/tokens';

type CreateTaskNavigation = NativeStackNavigationProp<MainStackParamList, 'CreateTask'>;
type CreateTaskRoute = RouteProp<MainStackParamList, 'CreateTask'>;
type SelectedImage = ImagePicker.ImagePickerAsset;

interface DraftStep {
  stepId: string;
  order: number;
  text: string;
  mediaAssetId?: string | null;
  /** Retained locally after a failed upload so the user can retry from Edit. */
  pendingPhoto?: SelectedImage;
}

interface StepEditorDraft {
  text: string;
  photo?: SelectedImage;
}

interface StepEditorProps {
  visible: boolean;
  step?: DraftStep;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: StepEditorDraft) => void;
  onChoosePhoto: (onSelected: (image: SelectedImage) => void) => void;
}

interface ScheduleSheetProps {
  visible: boolean;
  schedule?: TaskScheduleInput;
  busy: boolean;
  onCancel: () => void;
  onSave: (schedule: TaskScheduleInput) => void;
  onClear: () => void;
}

interface CategorySheetProps {
  visible: boolean;
  categories: Category[];
  isLoading: boolean;
  selectedCategoryId?: string;
  busy: boolean;
  onCancel: () => void;
  onSelect: (categoryId?: string) => void;
}

const REPEAT_OPTIONS: Array<{ label: string; repeatUnit: RepeatUnit }> = [
  { label: 'Every day', repeatUnit: 'DAY' },
  { label: 'Every week', repeatUnit: 'WEEK' },
  { label: 'Every month', repeatUnit: 'MONTH' },
];

function scheduleSignature(schedule?: TaskScheduleInput): string {
  return schedule ? JSON.stringify(schedule) : '';
}

function scheduleLabel(schedule?: TaskScheduleInput): string {
  if (!schedule) {
    return 'Tap to schedule this task';
  }

  const repeat = REPEAT_OPTIONS.find((option) => option.repeatUnit === schedule.repeatUnit);
  return repeat?.label ?? 'Scheduled task';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function contentTypeForImage(image: SelectedImage): string {
  if (image.mimeType?.startsWith('image/')) {
    return image.mimeType;
  }

  const extension = image.uri.split('?')[0].split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
    case 'heif':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

function fileNameForImage(image: SelectedImage, contentType: string): string {
  if (image.fileName?.trim()) {
    return image.fileName;
  }

  const suffix = contentType.split('/')[1] || 'jpg';
  return `image.${suffix}`;
}

async function uploadImageToPresignedUrl(
  image: SelectedImage,
  uploadUrl: string,
  contentType: string,
): Promise<number> {
  const body = image.file ?? (await fetch(image.uri)).blob();
  const bytes = await body;
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Image upload failed (${uploadResponse.status}). Please try again.`);
  }

  return image.fileSize ?? bytes.size;
}

function ScheduleSheet({ visible, schedule, busy, onCancel, onSave, onClear }: ScheduleSheetProps) {
  const insets = useSafeAreaInsets();
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>('DAY');

  const handleShown = () => {
    setRepeatUnit(schedule?.repeatUnit ?? 'DAY');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onShow={handleShown}
      onRequestClose={busy ? undefined : onCancel}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close schedule selector"
          disabled={busy}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel scheduling"
              disabled={busy}
              onPress={onCancel}
              style={({ pressed }) => [styles.sheetTextButton, pressed && !busy ? styles.pressed : null]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>Schedule Task</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save schedule"
              accessibilityState={{ busy }}
              disabled={busy}
              onPress={() => {
                onSave({
                  repeatEvery: 1,
                  repeatUnit,
                  firstOccurrenceAt: new Date().toISOString(),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                  enabled: true,
                });
              }}
              style={({ pressed }) => [styles.sheetTextButton, pressed && !busy ? styles.pressed : null]}
            >
              <Text style={styles.addText}>Set</Text>
            </Pressable>
          </View>

          <View style={styles.choiceSheetContent}>
            <Text style={styles.sectionLabel}>Repeat</Text>
            <View style={styles.choiceList}>
              {REPEAT_OPTIONS.map((option, index) => (
                <View key={option.repeatUnit}>
                  {index > 0 ? <View style={styles.choiceDivider} /> : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: repeatUnit === option.repeatUnit }}
                    disabled={busy}
                    onPress={() => setRepeatUnit(option.repeatUnit)}
                    style={({ pressed }) => [styles.choiceRow, pressed && !busy ? styles.choiceRowPressed : null]}
                  >
                    <Text style={styles.choiceText}>{option.label}</Text>
                    {repeatUnit === option.repeatUnit ? (
                      <Ionicons name="checkmark" size={22} color={colors.primary} />
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={styles.sheetHelperText}>The first occurrence will start when you save the task.</Text>
            {schedule ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear schedule"
                disabled={busy}
                onPress={onClear}
                style={({ pressed }) => [styles.clearScheduleButton, pressed && !busy ? styles.pressed : null]}
              >
                <Text style={styles.clearScheduleText}>Clear schedule</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CategorySheet({
  visible,
  categories,
  isLoading,
  selectedCategoryId,
  busy,
  onCancel,
  onSelect,
}: CategorySheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={busy ? undefined : onCancel}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close category selector"
          disabled={busy}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel category selection"
              disabled={busy}
              onPress={onCancel}
              style={({ pressed }) => [styles.sheetTextButton, pressed && !busy ? styles.pressed : null]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>Choose Category</Text>
            <View style={styles.sheetTextButton} />
          </View>

          <ScrollView contentContainerStyle={styles.choiceSheetContent} showsVerticalScrollIndicator={false}>
            <View style={styles.choiceList}>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel="No category"
                accessibilityState={{ selected: !selectedCategoryId }}
                disabled={busy}
                onPress={() => onSelect(undefined)}
                style={({ pressed }) => [styles.choiceRow, pressed && !busy ? styles.choiceRowPressed : null]}
              >
                <View style={[styles.categoryMark, { backgroundColor: colors.disabled }]} />
                <Text style={styles.choiceText}>No Category</Text>
                {!selectedCategoryId ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
              </Pressable>
              {categories.map((category) => (
                <View key={category.categoryId}>
                  <View style={styles.choiceDivider} />
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={category.name}
                    accessibilityState={{ selected: selectedCategoryId === category.categoryId }}
                    disabled={busy}
                    onPress={() => onSelect(category.categoryId)}
                    style={({ pressed }) => [styles.choiceRow, pressed && !busy ? styles.choiceRowPressed : null]}
                  >
                    <View style={[styles.categoryMark, { backgroundColor: category.color || colors.primary }]} />
                    <Text style={styles.choiceText}>{category.name}</Text>
                    {selectedCategoryId === category.categoryId ? (
                      <Ionicons name="checkmark" size={22} color={colors.primary} />
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
            {isLoading ? <ActivityIndicator color={colors.primary} style={styles.categoryLoading} /> : null}
            {!isLoading && categories.length === 0 ? (
              <Text style={styles.sheetHelperText}>No categories are available yet.</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StepEditor({
  visible,
  step,
  busy,
  onCancel,
  onSave,
  onChoosePhoto,
}: StepEditorProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedImage | undefined>();
  const isEditing = Boolean(step);

  // The state needs to be refreshed for each opening because this modal stays mounted.
  const handleShown = () => {
    setText(step?.text ?? '');
    setSelectedPhoto(step?.pendingPhoto);
  };

  const canSave = Boolean(text.trim()) && !busy;
  const hasAttachedPhoto = Boolean(selectedPhoto || step?.mediaAssetId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onShow={handleShown}
      onRequestClose={busy ? undefined : onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetKeyboardAvoider}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close step editor"
            disabled={busy}
            onPress={onCancel}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel step editing"
                disabled={busy}
                onPress={onCancel}
                style={({ pressed }) => [styles.sheetTextButton, pressed && !busy ? styles.pressed : null]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>{isEditing ? 'Edit Step' : 'Add Step'}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEditing ? 'Update step' : 'Add step'}
                accessibilityState={{ disabled: !canSave, busy }}
                disabled={!canSave}
                onPress={() => onSave({ text: text.trim(), photo: selectedPhoto })}
                style={({ pressed }) => [styles.sheetTextButton, pressed && canSave ? styles.pressed : null]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={[styles.addText, !canSave ? styles.disabledText : null]}>
                    {isEditing ? 'Update' : 'Add'}
                  </Text>
                )}
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.editorCard}>
                <Text style={styles.sectionLabel}>Step text</Text>
                <TextInput
                  accessibilityLabel="Step text"
                  autoFocus
                  editable={!busy}
                  value={text}
                  onChangeText={setText}
                  placeholder="e.g. Get eggs from fridge"
                  placeholderTextColor={colors.disabled}
                  style={styles.stepTextInput}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (canSave) {
                      onSave({ text: text.trim(), photo: selectedPhoto });
                    }
                  }}
                />
              </View>

              {selectedPhoto ? (
                <View style={styles.editorPhotoPreview}>
                  <Image
                    accessibilityLabel="Selected step photo"
                    source={{ uri: selectedPhoto.uri }}
                    style={styles.editorPhotoImage}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change step photo"
                    disabled={busy}
                    onPress={() => onChoosePhoto(setSelectedPhoto)}
                    style={({ pressed }) => [styles.changePhotoButton, pressed && !busy ? styles.pressed : null]}
                  >
                    <Ionicons name="camera-outline" size={16} color={colors.onPrimary} />
                    <Text style={styles.changePhotoText}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hasAttachedPhoto ? 'Replace step photo' : 'Add a step photo'}
                  disabled={busy}
                  onPress={() => onChoosePhoto(setSelectedPhoto)}
                  style={({ pressed }) => [
                    styles.addPhotoAction,
                    pressed && !busy ? styles.addPhotoActionPressed : null,
                    busy ? styles.controlDisabled : null,
                  ]}
                >
                  <Ionicons name="camera-outline" size={28} color={colors.primary} />
                  <View style={styles.addPhotoCopy}>
                    <Text style={styles.addPhotoTitle}>
                      {hasAttachedPhoto ? 'Replace photo' : 'Add a photo'}
                    </Text>
                    <Text style={styles.addPhotoDescription}>
                      {hasAttachedPhoto ? 'A photo is already attached to this step.' : 'Optional image guidance for this step.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEditing ? 'Update step' : 'Add step'}
                accessibilityState={{ disabled: !canSave, busy }}
                disabled={!canSave}
                onPress={() => onSave({ text: text.trim(), photo: selectedPhoto })}
                style={({ pressed }) => [
                  styles.sheetPrimaryButton,
                  !canSave ? styles.sheetPrimaryButtonDisabled : null,
                  pressed && canSave ? styles.primaryPressed : null,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.sheetPrimaryButtonText}>
                    {isEditing ? 'Update Step' : 'Add Step'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CreateTaskScreen() {
  const navigation = useNavigation<CreateTaskNavigation>();
  const route = useRoute<CreateTaskRoute>();
  const insets = useSafeAreaInsets();
  const existingTaskId = route.params?.taskId;
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const createTaskStepMutation = useCreateTaskStep();
  const updateTaskStepMutation = useUpdateTaskStep();
  const createCoverUploadUrlMutation = useCreateTaskCoverImageUploadUrl();
  const createMediaUploadUrlMutation = useCreateMediaUploadUrl();
  const createMediaAssetMutation = useCreateMediaAsset();
  const existingTaskQuery = useTask(existingTaskId ?? '');
  const existingStepsQuery = useTaskSteps(existingTaskId ?? '');
  const existingCoverQuery = useMediaDownloadUrl(
    existingTaskId ?? '',
    existingTaskQuery.data?.coverImageAssetId ?? '',
  );

  const [title, setTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const [taskId, setTaskId] = useState<string>();
  const [coverImage, setCoverImage] = useState<SelectedImage>();
  const [coverPreviewUri, setCoverPreviewUri] = useState<string>();
  const [coverNeedsUpload, setCoverNeedsUpload] = useState(false);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [categoryOwnerId, setCategoryOwnerId] = useState('');
  const [categoryId, setCategoryId] = useState<string>();
  const [savedCategoryId, setSavedCategoryId] = useState<string>();
  const [schedule, setSchedule] = useState<TaskScheduleInput>();
  const [savedSchedule, setSavedSchedule] = useState<TaskScheduleInput>();
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string>();
  const [stepEditorVisible, setStepEditorVisible] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();
  const [inlineError, setInlineError] = useState<string>();
  const [hydratedTaskId, setHydratedTaskId] = useState<string>();
  const [hydratedStepsTaskId, setHydratedStepsTaskId] = useState<string>();
  const categoriesQuery = useCategoriesByOwner(categoryOwnerId);

  const isBusy =
    Boolean(busyAction) ||
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    createTaskStepMutation.isPending ||
    updateTaskStepMutation.isPending ||
    createCoverUploadUrlMutation.isPending ||
    createMediaUploadUrlMutation.isPending ||
    createMediaAssetMutation.isPending;
  const trimmedTitle = title.trim();
  const editingStep = useMemo(
    () => steps.find((step) => step.stepId === editingStepId),
    [editingStepId, steps],
  );
  const categories = useMemo(
    () => categoriesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [categoriesQuery.data],
  );
  const selectedCategory = useMemo(
    () => categories.find((category) => category.categoryId === categoryId),
    [categories, categoryId],
  );
  const existingSteps = useMemo(
    () => existingStepsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [existingStepsQuery.data],
  );
  const isLoadingExistingTask = Boolean(existingTaskId) && (
    existingTaskQuery.isLoading || existingStepsQuery.isLoading
  );
  const taskCoverUri = coverImage?.uri ?? coverPreviewUri;

  useEffect(() => {
    const task = existingTaskQuery.data;
    if (!task || hydratedTaskId === task.taskId) {
      return;
    }

    setTaskId(task.taskId);
    setTitle(task.title);
    setSavedTitle(task.title);
    setCategoryId(task.categoryId ?? undefined);
    setSavedCategoryId(task.categoryId ?? undefined);
    setSchedule(task.schedule ?? undefined);
    setSavedSchedule(task.schedule ?? undefined);
    setHydratedTaskId(task.taskId);
  }, [existingTaskQuery.data, hydratedTaskId]);

  useEffect(() => {
    if (!existingTaskId || existingStepsQuery.isLoading || hydratedStepsTaskId === existingTaskId) {
      return;
    }

    setSteps(
      [...existingSteps]
        .sort((first, second) => first.order - second.order)
        .map((step) => ({
          stepId: step.stepId,
          order: step.order,
          text: step.text,
          mediaAssetId: step.mediaAssetId,
        })),
    );
    setHydratedStepsTaskId(existingTaskId);
  }, [existingSteps, existingStepsQuery.isLoading, existingTaskId, hydratedStepsTaskId]);

  useEffect(() => {
    if (existingCoverQuery.data?.downloadUrl && !coverImage) {
      setCoverPreviewUri(existingCoverQuery.data.downloadUrl);
    }
  }, [coverImage, existingCoverQuery.data?.downloadUrl]);

  useEffect(() => {
    let mounted = true;

    void getCurrentUserId()
      .then((ownerId) => {
        if (mounted) {
          setCategoryOwnerId(ownerId);
        }
      })
      .catch(() => {
        // Task creation resolves the identity again and renders the actionable error if unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const closeStepEditor = () => {
    if (isBusy) {
      return;
    }
    setStepEditorVisible(false);
    setEditingStepId(undefined);
  };

  const uploadCoverImage = async (id: string, image: SelectedImage) => {
    const contentType = contentTypeForImage(image);
    const target = await createCoverUploadUrlMutation.mutateAsync({
      contentType,
      fileName: fileNameForImage(image, contentType),
    });
    if (!target) {
      throw new Error('Could not prepare the task photo upload. Please try again.');
    }

    await uploadImageToPresignedUrl(image, target.uploadUrl, contentType);
    const updatedTask = await updateTaskMutation.mutateAsync({
      taskId: id,
      coverImageS3Key: target.s3Key,
    });
    if (!updatedTask) {
      throw new Error('Could not attach the task photo. Please try again.');
    }
  };

  const uploadStepPhoto = async (id: string, image: SelectedImage) => {
    const contentType = contentTypeForImage(image);
    const target = await createMediaUploadUrlMutation.mutateAsync({
      taskId: id,
      contentType,
      fileName: fileNameForImage(image, contentType),
    });
    if (!target) {
      throw new Error('Could not prepare the step photo upload. Please try again.');
    }

    const size = await uploadImageToPresignedUrl(image, target.uploadUrl, contentType);
    const ownerId = await getCurrentUserId();
    const mediaAsset = await createMediaAssetMutation.mutateAsync({
      taskId: id,
      s3Key: target.s3Key,
      type: 'IMAGE',
      mimeType: contentType,
      ownerId,
      size,
    });
    if (!mediaAsset) {
      throw new Error('Could not save the step photo. Please try again.');
    }

    return mediaAsset.assetId;
  };

  const selectImage = async (source: 'camera' | 'library', onSelected: (image: SelectedImage) => Promise<void> | void) => {
    if (isBusy) {
      return;
    }

    setBusyAction('picker');
    setInlineError(undefined);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          source === 'camera'
            ? 'Camera permission was denied. Enable it in device settings to take a photo.'
            : 'Photo library permission was denied. Enable it in device settings to choose a photo.',
        );
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!result.canceled && result.assets[0]) {
        await onSelected(result.assets[0]);
      }
    } catch (error) {
      setInlineError(errorMessage(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  const showImageSourceOptions = (onSelected: (image: SelectedImage) => Promise<void> | void) => {
    if (isBusy) {
      return;
    }
    Alert.alert('Add a photo', 'Choose how you would like to add an image.', [
      {
        text: 'Take photo',
        onPress: () => {
          void selectImage('camera', onSelected);
        },
      },
      {
        text: 'Choose from library',
        onPress: () => {
          void selectImage('library', onSelected);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleCoverSelected = async (image: SelectedImage) => {
    setCoverImage(image);
    setCoverPreviewUri(image.uri);
    setCoverNeedsUpload(true);

    if (!taskId) {
      return;
    }

    await uploadCoverImage(taskId, image);
    setCoverNeedsUpload(false);
  };

  const handleRemoveCover = async () => {
    if (isBusy || (!coverImage && !coverPreviewUri)) {
      return;
    }

    if (!taskId) {
      setCoverImage(undefined);
      setCoverPreviewUri(undefined);
      setCoverNeedsUpload(false);
      return;
    }

    setBusyAction('cover');
    setInlineError(undefined);
    try {
      const updatedTask = await updateTaskMutation.mutateAsync({ taskId, coverImageS3Key: null });
      if (!updatedTask) {
        throw new Error('Could not remove the task photo. Please try again.');
      }
      setCoverImage(undefined);
      setCoverPreviewUri(undefined);
      setCoverNeedsUpload(false);
    } catch (error) {
      setInlineError(errorMessage(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  const handleSaveTask = async () => {
    if (!trimmedTitle || isBusy) {
      return;
    }

    let shouldRedirectToAllTasks = false;
    setBusyAction('task');
    setInlineError(undefined);
    try {
      if (!taskId) {
        const ownerId = await getCurrentUserId();
        const createdTask = await createTaskMutation.mutateAsync({
          ownerId,
          title: trimmedTitle,
          status: 'DRAFT',
        });
        if (!createdTask) {
          throw new Error('Task creation returned no task. Please try again.');
        }

        setTaskId(createdTask.taskId);
        setSavedTitle(trimmedTitle);
        if (categoryId || schedule) {
          const configuredTask = await updateTaskMutation.mutateAsync({
            taskId: createdTask.taskId,
            ...(categoryId ? { categoryId } : {}),
            ...(schedule ? { schedule } : {}),
          });
          if (!configuredTask) {
            throw new Error('Could not save the task settings. Please try again.');
          }
        }
        setSavedCategoryId(categoryId);
        setSavedSchedule(schedule);
        if (coverImage) {
          await uploadCoverImage(createdTask.taskId, coverImage);
          setCoverNeedsUpload(false);
        }
        shouldRedirectToAllTasks = true;
        return;
      }

      const categoryChanged = categoryId !== savedCategoryId;
      const scheduleChanged = scheduleSignature(schedule) !== scheduleSignature(savedSchedule);
      if (trimmedTitle !== savedTitle || categoryChanged || scheduleChanged) {
        const updatedTask = await updateTaskMutation.mutateAsync({
          taskId,
          ...(trimmedTitle !== savedTitle ? { title: trimmedTitle } : {}),
          ...(categoryChanged ? { categoryId: categoryId ?? null } : {}),
          ...(scheduleChanged ? { schedule: schedule ?? null } : {}),
        });
        if (!updatedTask) {
          throw new Error('Could not save the task changes. Please try again.');
        }
        setSavedTitle(trimmedTitle);
        setSavedCategoryId(categoryId);
        setSavedSchedule(schedule);
      }

      if (coverImage && coverNeedsUpload) {
        await uploadCoverImage(taskId, coverImage);
        setCoverNeedsUpload(false);
      }
      shouldRedirectToAllTasks = true;
    } catch (error) {
      setInlineError(errorMessage(error));
    } finally {
      setBusyAction(undefined);
      if (shouldRedirectToAllTasks) {
        navigation.navigate('AllTasks');
      }
    }
  };

  const updateLocalStep = (stepId: string, patch: Partial<DraftStep>) => {
    setSteps((currentSteps) =>
      currentSteps.map((currentStep) =>
        currentStep.stepId === stepId ? { ...currentStep, ...patch } : currentStep,
      ),
    );
  };

  const attachPhotoToStep = async (
    id: string,
    step: DraftStep,
    photo: SelectedImage,
    changedText?: string,
  ) => {
    const mediaAssetId = await uploadStepPhoto(id, photo);
    const updatedStep = await updateTaskStepMutation.mutateAsync({
      taskId: id,
      stepId: step.stepId,
      ...(changedText ? { text: changedText } : {}),
      mediaAssetId,
    });
    if (!updatedStep) {
      throw new Error('Could not attach the step photo. Please try again.');
    }
    updateLocalStep(step.stepId, { text: changedText ?? step.text, mediaAssetId, pendingPhoto: undefined });
  };

  const handleSaveStep = async ({ text, photo }: StepEditorDraft) => {
    if (!taskId || !text || isBusy) {
      return;
    }

    setBusyAction('step');
    setInlineError(undefined);
    try {
      if (!editingStep) {
        const order = steps.length + 1;
        const createdStep = await createTaskStepMutation.mutateAsync({ taskId, order, text });
        if (!createdStep) {
          throw new Error('Step creation returned no step. Please try again.');
        }

        const localStep: DraftStep = {
          stepId: createdStep.stepId,
          order: createdStep.order,
          text: createdStep.text,
          mediaAssetId: createdStep.mediaAssetId,
          pendingPhoto: photo,
        };
        setSteps((currentSteps) => [...currentSteps, localStep]);
        setStepEditorVisible(false);
        setEditingStepId(undefined);

        if (photo) {
          await attachPhotoToStep(taskId, localStep, photo);
        }
        return;
      }

      const textChanged = editingStep.text !== text;
      const photoToUpload = photo;
      if (photoToUpload) {
        await attachPhotoToStep(taskId, editingStep, photoToUpload, textChanged ? text : undefined);
      } else if (textChanged) {
        const updatedStep = await updateTaskStepMutation.mutateAsync({
          taskId,
          stepId: editingStep.stepId,
          text,
        });
        if (!updatedStep) {
          throw new Error('Could not update the step. Please try again.');
        }
        updateLocalStep(editingStep.stepId, { text });
      }

      // An existing step with no changed text or newly selected photo makes no API update.
      setStepEditorVisible(false);
      setEditingStepId(undefined);
    } catch (error) {
      setInlineError(errorMessage(error));
    } finally {
      setBusyAction(undefined);
    }
  };

  const handleBack = () => {
    if (isBusy) {
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  if (isLoadingExistingTask) {
    return (
      <View style={styles.editorLoadingState}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.editorLoadingText}>Loading task…</Text>
      </View>
    );
  }

  if (existingTaskId && (existingTaskQuery.error || !existingTaskQuery.data)) {
    return (
      <View style={styles.editorLoadingState}>
        <Ionicons name="alert-circle" size={36} color={colors.danger} />
        <Text accessibilityRole="alert" style={styles.editorLoadingText}>
          {existingTaskQuery.error?.message || 'This task could not be found.'}
        </Text>
        <BackButton onPress={handleBack} variant="dark" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={handleBack} variant="dark" />
        <Text style={styles.headerTitle}>{existingTaskId ? 'Edit Task' : 'New Task'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save task"
          accessibilityState={{ disabled: !trimmedTitle || isBusy, busy: isBusy }}
          disabled={!trimmedTitle || isBusy}
          onPress={() => {
            void handleSaveTask();
          }}
          style={({ pressed }) => [
            styles.saveButton,
            !trimmedTitle || isBusy ? styles.saveButtonDisabled : null,
            pressed && trimmedTitle && !isBusy ? styles.primaryPressed : null,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save</Text>
              <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
            </>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {inlineError ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Task name</Text>
          <TextInput
            accessibilityLabel="Task name"
            editable={!isBusy}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Make breakfast"
            placeholderTextColor={colors.disabled}
            style={styles.taskTitleInput}
            returnKeyType="done"
            onSubmitEditing={() => {
              void handleSaveTask();
            }}
          />
        </View>

        <View style={[styles.card, styles.photoCard]}>
          <Text style={styles.sectionLabel}>Task photo</Text>
          {taskCoverUri ? (
            <View style={styles.coverPreview}>
              <Image accessibilityLabel="Selected task photo" source={{ uri: taskCoverUri }} style={styles.coverImage} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove task photo"
                disabled={isBusy}
                onPress={() => {
                  void handleRemoveCover();
                }}
                style={({ pressed }) => [styles.removePhotoButton, pressed && !isBusy ? styles.pressed : null]}
              >
                <Ionicons name="close" size={18} color={colors.onPrimary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change task photo"
                disabled={isBusy}
                onPress={() => showImageSourceOptions(handleCoverSelected)}
                style={({ pressed }) => [styles.changePhotoButton, pressed && !isBusy ? styles.pressed : null]}
              >
                <Ionicons name="camera-outline" size={16} color={colors.onPrimary} />
                <Text style={styles.changePhotoText}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a task photo"
              disabled={isBusy}
              onPress={() => showImageSourceOptions(handleCoverSelected)}
              style={({ pressed }) => [
                styles.addTaskPhoto,
                pressed && !isBusy ? styles.addPhotoActionPressed : null,
                isBusy ? styles.controlDisabled : null,
              ]}
            >
              <Ionicons name="camera-outline" size={32} color={colors.primary} />
              <Text style={styles.addTaskPhotoText}>Add a photo</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.stepsHeading}>
            <Text style={styles.sectionLabel}>Steps</Text>
            {taskId ? <Text style={styles.stepsStatus}>Saved task</Text> : null}
          </View>
          {!taskId ? <Text style={styles.stepHint}>Save the task before adding steps.</Text> : null}

          <View style={styles.stepList}>
            {steps.map((step, index) => (
              <View key={step.stepId} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepText}>{step.text}</Text>
                  {step.mediaAssetId || step.pendingPhoto ? (
                    <View style={styles.photoIndicator}>
                      <Ionicons name="image-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.photoIndicatorText}>Photo</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit step ${index + 1}`}
                  disabled={isBusy}
                  onPress={() => {
                    setEditingStepId(step.stepId);
                    setStepEditorVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.editStepButton,
                    pressed && !isBusy ? styles.addPhotoActionPressed : null,
                    isBusy ? styles.controlDisabled : null,
                  ]}
                >
                  <Text style={styles.editStepText}>Edit</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={taskId ? 'Add a step' : 'Save the task before adding a step'}
            accessibilityState={{ disabled: !taskId || isBusy }}
            disabled={!taskId || isBusy}
            onPress={() => {
              setEditingStepId(undefined);
              setStepEditorVisible(true);
            }}
            style={({ pressed }) => [
              styles.addStepButton,
              pressed && taskId && !isBusy ? styles.addPhotoActionPressed : null,
              !taskId || isBusy ? styles.controlDisabled : null,
            ]}
          >
            <Ionicons name="add" size={22} color={taskId && !isBusy ? colors.primary : colors.disabled} />
            <Text style={[styles.addStepText, !taskId || isBusy ? styles.disabledText : null]}>Add a Step</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Schedule</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={schedule ? `Change schedule, ${scheduleLabel(schedule)}` : 'Schedule this task'}
            accessibilityState={{ disabled: isBusy }}
            disabled={isBusy}
            onPress={() => setScheduleSheetVisible(true)}
            style={({ pressed }) => [
              styles.selectionRow,
              pressed && !isBusy ? styles.selectionRowPressed : null,
              isBusy ? styles.controlDisabled : null,
            ]}
          >
            <Text style={[styles.selectionText, schedule ? styles.selectionTextActive : null]}>
              {scheduleLabel(schedule)}
            </Text>
            <Ionicons name="chevron-forward" size={24} color={colors.disabled} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Category</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a category"
            accessibilityState={{ disabled: isBusy }}
            disabled={isBusy}
            onPress={() => setCategorySheetVisible(true)}
            style={({ pressed }) => [
              styles.selectionRow,
              pressed && !isBusy ? styles.selectionRowPressed : null,
              isBusy ? styles.controlDisabled : null,
            ]}
          >
            {selectedCategory ? (
              <View style={[styles.selectedCategoryMark, { backgroundColor: selectedCategory.color || colors.primary }]} />
            ) : null}
            <Text style={[styles.selectionText, selectedCategory ? styles.selectionTextActive : null]}>
              {selectedCategory?.name || 'No Category'}
            </Text>
            <Ionicons name="chevron-forward" size={24} color={colors.disabled} />
          </Pressable>
        </View>
      </ScrollView>

      <StepEditor
        visible={stepEditorVisible}
        step={editingStep}
        busy={isBusy}
        onCancel={closeStepEditor}
        onSave={(draft) => {
          void handleSaveStep(draft);
        }}
        onChoosePhoto={(onSelected) => showImageSourceOptions(async (image) => onSelected(image))}
      />
      <ScheduleSheet
        visible={scheduleSheetVisible}
        schedule={schedule}
        busy={isBusy}
        onCancel={() => setScheduleSheetVisible(false)}
        onSave={(nextSchedule) => {
          setSchedule(nextSchedule);
          setScheduleSheetVisible(false);
        }}
        onClear={() => {
          setSchedule(undefined);
          setScheduleSheetVisible(false);
        }}
      />
      <CategorySheet
        visible={categorySheetVisible}
        categories={categories}
        isLoading={categoriesQuery.isLoading}
        selectedCategoryId={categoryId}
        busy={isBusy}
        onCancel={() => setCategorySheetVisible(false)}
        onSelect={(nextCategoryId) => {
          setCategoryId(nextCategoryId);
          setCategorySheetVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  editorLoadingState: {
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  editorLoadingText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
    ...typography.display,
    color: colors.text,
  },
  saveButton: {
    minWidth: 104,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  saveButtonText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FEE8E8',
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    ...typography.caption,
    color: colors.danger,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg + spacing.md,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  photoCard: {
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  taskTitleInput: {
    ...typography.title,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  addTaskPhoto: {
    minHeight: 184,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(224, 119, 68, 0.45)',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addTaskPhotoText: {
    ...typography.heading,
    color: colors.primary,
  },
  coverPreview: {
    height: 184,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 34, 48, 0.7)',
  },
  changePhotoButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(27, 34, 48, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  changePhotoText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  stepsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsStatus: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.success,
  },
  stepHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  stepList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  stepCopy: {
    flex: 1,
    minWidth: 0,
  },
  stepText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  photoIndicatorText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  editStepButton: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  editStepText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  addStepButton: {
    minHeight: 76,
    marginTop: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(224, 119, 68, 0.45)',
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addStepText: {
    ...typography.heading,
    color: colors.primary,
  },
  disabledText: {
    color: colors.disabled,
  },
  controlDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
  primaryPressed: {
    backgroundColor: colors.primaryDark,
  },
  addPhotoActionPressed: {
    backgroundColor: colors.surfaceWarm,
  },
  selectionRow: {
    minHeight: 88,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectionRowPressed: {
    backgroundColor: colors.border,
  },
  selectionText: {
    flex: 1,
    ...typography.heading,
    color: colors.textMuted,
  },
  selectionTextActive: {
    color: colors.text,
  },
  selectedCategoryMark: {
    width: 12,
    height: 38,
    borderRadius: radius.pill,
  },
  sheetKeyboardAvoider: {
    flex: 1,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(27, 34, 48, 0.48)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.lg + spacing.md,
    borderTopRightRadius: radius.lg + spacing.md,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.disabled,
  },
  sheetHeader: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTextButton: {
    minWidth: 70,
    minHeight: 40,
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  sheetTitle: {
    ...typography.heading,
    color: colors.text,
  },
  addText: {
    alignSelf: 'flex-end',
    ...typography.bodyStrong,
    color: colors.primary,
  },
  sheetContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  choiceSheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  choiceList: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceRow: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  choiceRowPressed: {
    backgroundColor: colors.bg,
  },
  choiceText: {
    flex: 1,
    ...typography.bodyStrong,
    color: colors.text,
  },
  choiceDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  categoryMark: {
    width: 12,
    height: 34,
    borderRadius: radius.pill,
  },
  categoryLoading: {
    marginVertical: spacing.lg,
  },
  sheetHelperText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  clearScheduleButton: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE8E8',
    marginTop: spacing.sm,
  },
  clearScheduleText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  editorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepTextInput: {
    ...typography.heading,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  addPhotoAction: {
    minHeight: 96,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addPhotoCopy: {
    flex: 1,
  },
  addPhotoTitle: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  addPhotoDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  editorPhotoPreview: {
    height: 136,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  editorPhotoImage: {
    width: '100%',
    height: '100%',
  },
  sheetPrimaryButton: {
    minHeight: 56,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sheetPrimaryButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  sheetPrimaryButtonText: {
    ...typography.button,
    color: colors.onPrimary,
  },
});
