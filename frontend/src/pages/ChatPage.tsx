import { useState, FormEvent, useEffect, useRef } from 'react';
import { chatAPI, Message as APIMessage, ChatSession, resourceAPI, ResourceFile, lessonPlanAPI, notesAPI, calendarEventsAPI, calendarClassesAPI, assignmentsAPI, preferencesAPI } from '../services/api';
import { ToastStack, useToasts } from '../components/Toast';

type Message = { from: 'user' | 'assistant'; text: string };
type AssignmentItem = { id: number; title: string; dueDate: string; className?: string };
type ClassItem = { id: number; name: string; timeFrom: string; timeTo: string; room?: string; date: string };
type LessonPlanItem = { id: string; title: string; instructions: string; resourceFileId?: number };
type NoteItem = { id: string; title: string; content: string; updatedAt: string };
type AssignmentDraft = { title: string; dueDate: string; className?: string };
type ClassDraft = { name: string; timeFrom: string; timeTo: string; room?: string; date: string };
type TeacherPreferences = {
  gradeLevel: string;
  curriculum: string;
  classSize: string;
  teachingStyle: string;
};

const timeOptions = Array.from({ length: 48 }, (_, idx) => {
  const hours = Math.floor(idx / 2);
  const minutes = idx % 2 === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
});

const panelContent: Record<string, string> = {
  'Lesson Plans': 'Build reusable lesson blueprints with objectives, activities, and differentiation notes.',
  'Calendar': 'Plan dates, classes, and daily focus blocks in one place.',
  'Resources': 'Curate a library of links, worksheets, and media for lessons.',
};

const presetLessonPlans: LessonPlanItem[] = [
  {
    id: 'preset-differentiate',
    title: 'Differentiate for Mixed Ability',
    instructions: 'Adapt this lesson for students at different ability levels. Provide scaffolding for struggling learners, core content for grade-level students, and extension activities for advanced learners. Include specific strategies for visual, auditory, and kinesthetic learners.',
  },
  {
    id: 'preset-assessment',
    title: 'Create Assessment',
    instructions: 'Generate a comprehensive assessment that tests understanding of the key concepts. Include a mix of question types: multiple choice, short answer, and application problems. Provide a clear rubric and answer key.',
  },
  {
    id: 'preset-homework',
    title: 'Generate Homework',
    instructions: 'Create engaging homework assignments that reinforce today\'s lesson. Include 3-5 problems of varying difficulty, one real-world application question, and an optional challenge problem. Keep it achievable in 20-30 minutes.',
  },
  {
    id: 'preset-explain',
    title: 'Explain Concept Simply',
    instructions: 'Break down this concept into simple, easy-to-understand language suitable for students. Use analogies, real-world examples, and step-by-step explanations. Anticipate common misconceptions and address them.',
  },
];

const ChatPage = () => {
  const { toasts, push, remove } = useToasts();
  const pendingSendKey = 'teacherbuddy.pendingSend';
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [panel, setPanel] = useState<string>('Lesson Plans');
  const [modal, setModal] = useState<string | null>(null);
  const [events, setEvents] = useState<{ id: number; date: string; title: string }[]>([]);
  const [eventDraft, setEventDraft] = useState<{ date: string; title: string }>({ date: '', title: '' });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [dayDetailsDate, setDayDetailsDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [resourceFiles, setResourceFiles] = useState<ResourceFile[]>([]);
  const [resourceUpload, setResourceUpload] = useState<FileList | null>(null);
  const [resourceUploading, setResourceUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>({ title: '', dueDate: '', className: undefined });
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classDraft, setClassDraft] = useState<ClassDraft>({ name: '', timeFrom: '', timeTo: '', room: undefined, date: '' });
  const [lessonPlans, setLessonPlans] = useState<LessonPlanItem[]>([]);
  const [lessonDraft, setLessonDraft] = useState<Omit<LessonPlanItem, 'id'>>({ title: '', instructions: '', resourceFileId: undefined });
  const [editingLessonPlanId, setEditingLessonPlanId] = useState<string | null>(null);
  const [lessonEditDraft, setLessonEditDraft] = useState<Omit<LessonPlanItem, 'id'>>({ title: '', instructions: '', resourceFileId: undefined });
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState<string | null>(null);
  const [selectedResourceFileIds, setSelectedResourceFileIds] = useState<number[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteTitleDraft, setNoteTitleDraft] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(undefined);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [thinkingSessionId, setThinkingSessionId] = useState<number | 'new' | null>(null);
  const [thinkingPreviewTitle, setThinkingPreviewTitle] = useState<string>('');
  const [truncatedSessionIds, setTruncatedSessionIds] = useState<number[]>([]);
  const [teacherPreferences, setTeacherPreferences] = useState<TeacherPreferences>({
    gradeLevel: '',
    curriculum: '',
    classSize: '',
    teachingStyle: '',
  });
  const [preferencesDraft, setPreferencesDraft] = useState<TeacherPreferences>({
    gradeLevel: '',
    curriculum: '',
    classSize: '',
    teachingStyle: '',
  });
  const newChatRequestedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resumeAttemptedRef = useRef(false);

  // Load chat sessions on mount
  useEffect(() => {
    loadSessions();
    loadAllData();
    loadPreferences();
    resumePendingSend();
  }, []);

  const savePendingSend = (payload: { text: string; sessionId?: number | null; context?: string; resourceId?: number | null }) => {
    localStorage.setItem(pendingSendKey, JSON.stringify(payload));
  };

  const clearPendingSend = () => {
    localStorage.removeItem(pendingSendKey);
  };

  const resumePendingSend = async () => {
    // Prevent multiple attempts to resume the same pending send
    if (resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;

    const raw = localStorage.getItem(pendingSendKey);
    if (!raw || sending) return;

    try {
      const pending = JSON.parse(raw) as { text: string; sessionId?: number | null; context?: string; resourceId?: number | null };
      if (!pending?.text) {
        clearPendingSend();
        return;
      }

      setSending(true);
      setThinkingSessionId(pending.sessionId ?? 'new');
      setThinkingPreviewTitle(pending.text.substring(0, 50) + (pending.text.length > 50 ? '...' : ''));

      const response = await chatAPI.sendMessage(
        pending.text,
        pending.sessionId ?? undefined,
        pending.context,
        pending.resourceId ?? undefined
      );

      clearPendingSend();
      // Load the new session directly instead of reloading all sessions
      // Note: don't call loadSessions() here to avoid duplicates from race condition with initial useEffect call
      await loadSession(response.session_id);
    } catch (error) {
      console.error('Failed to resume pending send:', error);
    } finally {
      setSending(false);
      setThinkingSessionId(null);
      setThinkingPreviewTitle('');
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await preferencesAPI.get();
      setTeacherPreferences(prefs);
      setPreferencesDraft(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      const updated = await preferencesAPI.update(preferencesDraft);
      setTeacherPreferences(updated);
      push('Preferences saved', 'success');
      setModal(null);
    } catch (error) {
      push('Failed to save preferences', 'error');
    }
  };

  const loadAllData = async () => {
    try {
      // Load lesson plans
      const plansRes = await lessonPlanAPI.list();
      setLessonPlans(plansRes.resources.map(p => ({
        id: p.id.toString(),
        title: p.title,
        instructions: p.instructions,
        resourceFileId: p.resourceFileId
      })));

      // Load notes
      const notesRes = await notesAPI.list();
      setNotes(notesRes.map(n => ({
        id: n.id.toString(),
        title: n.title,
        content: n.content,
        updatedAt: n.updatedAt
      })));

      // Load calendar events
      const eventsRes = await calendarEventsAPI.list();
      setEvents(eventsRes);

      // Load calendar classes
      const classesRes = await calendarClassesAPI.list();
      setClasses(classesRes);

      // Load assignments
      const assignmentsRes = await assignmentsAPI.list();
      setAssignments(assignmentsRes);

      // Load resources
      const resourcesRes = await resourceAPI.list();
      setResourceFiles(resourcesRes.resources);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await chatAPI.getSessions();
      setSessions(response.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadSession = async (sessionId: number) => {
    try {
      setLoading(true);
      newChatRequestedRef.current = false;
      const response = await chatAPI.getSessionHistory(sessionId);
      const loadedMessages = response.messages.map((msg) => ({
        from: msg.role as 'user' | 'assistant',
        text: msg.content,
      }));
      const hasTruncatedNotice = truncatedSessionIds.includes(sessionId);
      setMessages(
        hasTruncatedNotice
          ? [
              ...loadedMessages,
              { from: 'assistant', text: 'Message truncated. Continue in a new chat.' },
            ]
          : loadedMessages
      );
      setCurrentSessionId(sessionId);
    } catch (error: any) {
      push(error.response?.data?.error || 'Failed to load chat history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: number) => {
    try {
      if (currentSessionId === sessionId && sending) {
        stopAI();
      }
      await chatAPI.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(undefined);
        setMessages([]);
      }
      setTruncatedSessionIds((prev) => prev.filter((id) => id !== sessionId));
      await loadSessions();
      push('Chat deleted successfully', 'success');
    } catch (error: any) {
      push(error.response?.data?.error || 'Failed to delete chat', 'error');
    }
  };

  const stopAI = () => {
    // Cancel the fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearPendingSend();
    setSending(false);
    setThinkingSessionId(null);
    setThinkingPreviewTitle('');
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    const hasSelection = Boolean(selectedLessonPlanId) || selectedResourceFileIds.length > 0;
    if ((!trimmed && !hasSelection) || sending) return;
    const effectiveText = trimmed || 'Use the selected lesson plan and resources to generate the requested output.';

    // Build context with teacher preferences
    let contextParts: string[] = [];
    
    if (selectedLessonPlan?.instructions) {
      contextParts.push(selectedLessonPlan.instructions);
    }
    
    // Auto-inject teacher preferences if set
    const prefsContext: string[] = [];
    if (teacherPreferences.gradeLevel) {
      prefsContext.push(`Grade Level: ${teacherPreferences.gradeLevel}`);
    }
    if (teacherPreferences.curriculum) {
      prefsContext.push(`Curriculum: ${teacherPreferences.curriculum}`);
    }
    if (teacherPreferences.classSize) {
      prefsContext.push(`Class Size: ${teacherPreferences.classSize}`);
    }
    if (teacherPreferences.teachingStyle) {
      prefsContext.push(`Teaching Style: ${teacherPreferences.teachingStyle}`);
    }
    
    if (prefsContext.length > 0) {
      contextParts.push(`Teacher Context: ${prefsContext.join(', ')}`);
    }
    
    // Add note about multiple selected resources
    if (selectedResourceFileIds.length > 1) {
      const resourceNames = selectedResources.map(r => r.filename).join(', ');
      contextParts.push(`Note: User has selected ${selectedResourceFileIds.length} resources: ${resourceNames}. Please reference all relevant files in your response.`);
    }
    
    const fullContext = contextParts.length > 0 ? contextParts.join('\n\n') : undefined;

    // Add user message immediately
    const userMessage: Message = { from: 'user', text: effectiveText };
    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    setSending(true);
    setThinkingSessionId(currentSessionId ?? 'new');
    setThinkingPreviewTitle(effectiveText.substring(0, 50) + (effectiveText.length > 50 ? '...' : ''));

    // If it's a new chat, track it
    const isNewChat = !currentSessionId || newChatRequestedRef.current;
    
    if (isNewChat) {
      setCurrentSessionId(undefined); // Mark as pending
    }

    try {
      const sessionIdToSend = newChatRequestedRef.current ? undefined : (currentSessionId && currentSessionId > 0 ? currentSessionId : undefined);
      const resourceIdsToSend = selectedResourceFileIds.length > 0 ? selectedResourceFileIds : (selectedLessonPlan?.resourceFileId ? [selectedLessonPlan.resourceFileId] : []);
      savePendingSend({
        text: effectiveText,
        sessionId: sessionIdToSend ?? null,
        context: fullContext,
        resourceId: resourceIdsToSend.length > 0 ? resourceIdsToSend[0] : null,
      });

      const response = await chatAPI.sendMessage(
        effectiveText,
        sessionIdToSend,
        fullContext,
        resourceIdsToSend.length > 0 ? resourceIdsToSend[0] : undefined // Backend currently supports single resource
      );
      
      // Update session ID with the real one from server
      if (isNewChat) {
        setCurrentSessionId(response.session_id);
        newChatRequestedRef.current = false;
        // Refresh sessions list to show the new chat
        await loadSessions();
      }

      // Add AI response
      const aiMessage: Message = { from: 'assistant', text: response.ai_message.content };
      setMessages((prev) => [...prev, aiMessage]);
      clearPendingSend();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to send message. Please try again.';
      push(errorMessage, 'error');
      
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
      if (trimmed) {
        setDraft(trimmed); // Restore the draft
      }
    } finally {
      setSending(false);
      setThinkingSessionId(null);
      setThinkingPreviewTitle('');
      clearPendingSend();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  const openModal = (name: string) => {
    setPanel(name);
    setModal(name);
    if (name === 'Resources') {
      loadResourceFiles();
    }
    if (name === 'Lesson Plans') {
      loadResourceFiles();
    }
  };

  const addEvent = async () => {
    if (!eventDraft.date || !eventDraft.title.trim()) return;
    try {
      const created = await calendarEventsAPI.create(eventDraft.date, eventDraft.title);
      setEvents((prev) => [...prev, created]);
      setEventDraft({ date: '', title: '' });
      push('Event created', 'success');
    } catch (error) {
      push('Failed to create event', 'error');
    }
  };

  const loadResourceFiles = async () => {
    try {
      const response = await resourceAPI.list();
      setResourceFiles(response.resources);
    } catch (error: any) {
      push(error.response?.data?.error || 'Failed to load resources', 'error');
    }
  };

  const deleteResourceFile = async (fileId: number) => {
    try {
      await resourceAPI.delete(fileId);
      setResourceFiles((prev) => prev.filter((file) => file.id !== fileId));
      setSelectedResourceFileIds((prev) => prev.filter((id) => id !== fileId));
      push('Resource deleted', 'success');
    } catch (error: any) {
      push('Failed to delete resource', 'error');
    }
  };

  const uploadResourceFile = async () => {
    if (!resourceUpload || resourceUploading || resourceUpload.length === 0) return;
    setResourceUploading(true);
    
    const files = Array.from(resourceUpload);
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const file of files) {
        try {
          const uploaded = await resourceAPI.upload(file);
          setResourceFiles((prev) => [uploaded, ...prev]);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }
      
      setResourceUpload(null);
      
      if (successCount > 0 && failCount === 0) {
        push(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`, 'success');
      } else if (successCount > 0 && failCount > 0) {
        push(`${successCount} uploaded, ${failCount} failed`, 'error');
      } else {
        push('Failed to upload files', 'error');
      }
    } catch (error: any) {
      push(error.response?.data?.error || 'Failed to upload resources', 'error');
    } finally {
      setResourceUploading(false);
    }
  };

  const addAssignment = async () => {
    if (!assignmentDraft.title.trim() || !assignmentDraft.dueDate) return;
    try {
      const created = await assignmentsAPI.create(assignmentDraft.title, assignmentDraft.dueDate, assignmentDraft.className);
      setAssignments((prev) => [...prev, created]);
      setAssignmentDraft({ title: '', dueDate: '', className: undefined });
      push('Assignment created', 'success');
    } catch (error) {
      push('Failed to create assignment', 'error');
    }
  };

  const addClass = async () => {
    if (!classDraft.name.trim() || !classDraft.timeFrom.trim() || !classDraft.timeTo.trim() || !classDraft.date) return;
    try {
      const created = await calendarClassesAPI.create(classDraft.name, classDraft.date, classDraft.timeFrom, classDraft.timeTo, classDraft.room);
      setClasses((prev) => [...prev, created]);
      setClassDraft({ name: '', timeFrom: '', timeTo: '', room: undefined, date: '' });
      push('Class created', 'success');
    } catch (error) {
      push('Failed to create class', 'error');
    }
  };

  const applySelectedDate = (date: string) => {
    setSelectedDate(date);
    setEventDraft((p) => ({ ...p, date }));
    setClassDraft((p) => ({ ...p, date }));
    setAssignmentDraft((p) => ({ ...p, dueDate: date }));
  };

  const addLessonPlan = async () => {
    if (!lessonDraft.title.trim() || !lessonDraft.instructions.trim()) return;
    try {
      const newPlan = await lessonPlanAPI.create(lessonDraft.title, lessonDraft.instructions, lessonDraft.resourceFileId);
      const planItem: LessonPlanItem = {
        id: newPlan.id.toString(),
        title: newPlan.title,
        instructions: newPlan.instructions,
        resourceFileId: newPlan.resourceFileId
      };
      setLessonPlans((prev) => [planItem, ...prev]);
      setLessonDraft({ title: '', instructions: '', resourceFileId: undefined });
      setSelectedLessonPlanId(planItem.id);
      push('Lesson plan created', 'success');
    } catch (error) {
      push('Failed to create lesson plan', 'error');
    }
  };

  const startEditLessonPlan = (plan: LessonPlanItem) => {
    setEditingLessonPlanId(plan.id);
    setLessonEditDraft({
      title: plan.title,
      instructions: plan.instructions,
      resourceFileId: plan.resourceFileId,
    });
  };

  const cancelEditLessonPlan = () => {
    setEditingLessonPlanId(null);
    setLessonEditDraft({ title: '', instructions: '', resourceFileId: undefined });
  };

  const saveLessonPlan = async (planId: string) => {
    if (!lessonEditDraft.title.trim() || !lessonEditDraft.instructions.trim()) return;
    try {
      const updated = await lessonPlanAPI.update(
        Number(planId),
        lessonEditDraft.title,
        lessonEditDraft.instructions,
        lessonEditDraft.resourceFileId
      );
      setLessonPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                title: updated.title,
                instructions: updated.instructions,
                resourceFileId: updated.resourceFileId,
              }
            : p
        )
      );
      if (selectedLessonPlanId === planId) {
        setSelectedLessonPlanId(planId);
      }
      push('Lesson plan updated', 'success');
      cancelEditLessonPlan();
    } catch (error) {
      push('Failed to update lesson plan', 'error');
    }
  };

  const cloneLessonPlan = async (plan: LessonPlanItem) => {
    try {
      const clonedTitle = `${plan.title} (Copy)`;
      const newPlan = await lessonPlanAPI.create(clonedTitle, plan.instructions, plan.resourceFileId);
      const planItem: LessonPlanItem = {
        id: newPlan.id.toString(),
        title: newPlan.title,
        instructions: newPlan.instructions,
        resourceFileId: newPlan.resourceFileId
      };
      setLessonPlans((prev) => [planItem, ...prev]);
      push('Lesson plan cloned', 'success');
      startEditLessonPlan(planItem); // Open for editing immediately
    } catch (error) {
      push('Failed to clone lesson plan', 'error');
    }
  };

  const selectedLessonPlan = [...presetLessonPlans, ...lessonPlans].find((plan) => plan.id === selectedLessonPlanId) || null;
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;
  const selectedResources = resourceFiles.filter((file) => selectedResourceFileIds.includes(file.id));

  // Check if file selection would exceed limits
  const canAddMoreFiles = () => {
    const selectedLessonPlanWithFile = selectedLessonPlan && selectedLessonPlan.resourceFileId;
    const totalFiles = selectedResourceFileIds.length;
    
    // If lesson plan has a file, can't add more resources
    if (selectedLessonPlanWithFile) return false;
    
    // If already have 2 resource files, can't add more
    if (totalFiles >= 2) return false;
    
    // If have 1 resource file and 1 lesson plan, can't add more
    if (totalFiles >= 1 && selectedLessonPlan) return false;
    
    return true;
  };

  const handleResourceSelect = (fileId: number, isCurrentlySelected: boolean) => {
    if (isCurrentlySelected) {
      setSelectedResourceFileIds((prev) => prev.filter((id) => id !== fileId));
    } else if (canAddMoreFiles()) {
      setSelectedResourceFileIds((prev) => [...prev, fileId]);
    } else {
      const selectedLessonPlanWithFile = selectedLessonPlan && selectedLessonPlan.resourceFileId;
      if (selectedLessonPlanWithFile) {
        push('Lesson plan already has a file. Remove the lesson plan or select a different one.', 'error');
      } else if (selectedLessonPlan && selectedResourceFileIds.length >= 1) {
        push('Max 1 resource file per lesson plan. Remove the resource or deselect the lesson plan.', 'error');
      } else {
        push('Max 2 resource files per prompt', 'error');
      }
    }
  };

  const startNewChat = () => {
    if (sending) {
      stopAI();
      if (currentSessionId && currentSessionId > 0) {
        setTruncatedSessionIds((prev) => (prev.includes(currentSessionId) ? prev : [...prev, currentSessionId]));
      }
    }
    setMessages([]);
    setCurrentSessionId(undefined);
    newChatRequestedRef.current = true;
    // Load sessions to show chat history when opening new chat
    loadSessions();
  };

  const addNote = async () => {
    if (!noteTitleDraft.trim()) return;
    try {
      const newNote = await notesAPI.create(noteTitleDraft.trim(), '');
      const noteItem: NoteItem = {
        id: newNote.id.toString(),
        title: newNote.title,
        content: newNote.content,
        updatedAt: newNote.updatedAt
      };
      setNotes((prev) => [noteItem, ...prev]);
      setSelectedNoteId(noteItem.id);
      setNoteTitleDraft('');
      push('Note created', 'success');
    } catch (error) {
      push('Failed to create note', 'error');
    }
  };

  const updateSelectedNoteContent = async (value: string) => {
    if (!selectedNote) return;
    try {
      const updated = await notesAPI.update(parseInt(selectedNote.id), selectedNote.title, value);
      setNotes((prev) => prev.map((note) => (
        note.id === selectedNote.id
          ? { ...note, content: value, updatedAt: updated.updatedAt }
          : note
      )));
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if we're leaving the chat-area itself, not a child element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setResourceUpload(files);
      setModal('Resources');
      push(`${files.length} file${files.length > 1 ? 's' : ''} ready to upload`, 'success');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await notesAPI.delete(parseInt(noteId));
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
      push('Note deleted', 'success');
    } catch (error) {
      push('Failed to delete note', 'error');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex, 1).getDay();
  };

  const formatDate = (year: number, monthIndex: number, day: number) => {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isThinkingHere = sending
    && (thinkingSessionId === currentSessionId || (thinkingSessionId === 'new' && currentSessionId === undefined));
  const showThinkingBanner = sending && !isThinkingHere;

  return (
    <section className="section chat-page" style={{ maxWidth: '100%' }}>
      <div className="chat-layout">
        <aside className="sidebar">
          <button 
            onClick={startNewChat}
            className="btn primary"
            style={{ width: '100%', marginBottom: '12px', justifyContent: 'center' }}
          >
            New Chat
          </button>
          
          {sessions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '14px', color: 'var(--muted)' }}>Chat History</strong>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    gap: '6px',
                    marginTop: '6px',
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() => loadSession(session.id)}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      padding: '8px',
                      borderColor: currentSessionId === session.id ? 'var(--primary)' : 'var(--border)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      ...(currentSessionId === session.id && {
                        boxShadow: `0 0 0 2px var(--primary)`,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      }),
                    }}
                  >
                    {session.title}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderColor: 'var(--border)',
                      background: 'var(--card)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      minWidth: '32px',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                    }}
                    title="Delete chat"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr style={{ margin: '12px 0', borderColor: 'var(--border)' }} />

          {Object.keys(panelContent).map((item) => (
            <button
              key={item}
              onClick={() => openModal(item)}
              aria-pressed={panel === item}
              style={panel === item ? { borderColor: 'var(--primary)', color: 'var(--text)' } : undefined}
            >
              {item}
            </button>
          ))}

          <button
            onClick={() => openModal('Notes')}
            aria-pressed={panel === 'Notes'}
            style={panel === 'Notes' ? { borderColor: 'var(--primary)', color: 'var(--text)' } : undefined}
          >
            Notes
          </button>

          <hr style={{ margin: '12px 0', borderColor: 'var(--border)' }} />

          <button
            onClick={() => openModal('Preferences')}
            style={{ 
              background: 'var(--primary)', 
              color: '#fff',
              fontWeight: 600,
            }}
          >
            ⚙️ Teacher Settings
          </button>
        </aside>

        <div 
          className="chat-area"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            position: 'relative',
            border: isDragging ? '2px dashed var(--primary)' : undefined,
            borderRadius: isDragging ? '12px' : undefined,
            backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.03)' : undefined,
            transition: 'all 0.2s ease',
          }}
        >
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderRadius: '12px',
                zIndex: 1000,
                pointerEvents: 'none',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--primary)',
              }}
            >
              📂 Drop files to upload as resources
            </div>
          )}
          <div className="panel-card">
            <strong>{panel}</strong>
            <p className="action-sub" style={{ marginTop: 6 }}>{panelContent[panel]}</p>
          </div>

          <div className="chat-window">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => openModal('Select Lesson Plans')}
                disabled={sending}
              >
                Lesson Plans
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => openModal('Resources')}
                disabled={sending}
              >
                Resources
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: '12px', flexWrap: 'wrap' }}>
              {selectedLessonPlan && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--primary)', color: '#fff', borderRadius: '6px' }}>
                  <span>📋 {selectedLessonPlan.title}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLessonPlanId(null)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      padding: 0,
                    }}
                    title="Remove lesson plan"
                  >
                    ×
                  </button>
                </div>
              )}
              {selectedResources.map((resource) => (
                <div key={resource.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--primary)', color: '#fff', borderRadius: '6px' }}>
                  <span>📄 {resource.filename}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedResourceFileIds((prev) => prev.filter((id) => id !== resource.id))}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      padding: 0,
                    }}
                    title="Remove resource"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {messages.length === 0 ? (
              <div />
            ) : (
              <div className="messages">
                {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Loading chat history...</div>}
                {messages.map((m, idx) => (
                  <div className={`msg ${m.from === 'user' ? 'user' : ''}`} key={`${m.from}-${idx}`}>
                    <div className="bubble">{m.text}</div>
                  </div>
                ))}
              </div>
            )}

            <form className="composer" onSubmit={onSubmit}>
              <input
                placeholder="How can I assist with your teaching today?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Message input"
                disabled={sending}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {sending && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: '2px solid var(--line)',
                        borderTopColor: 'var(--text)',
                        display: 'inline-block',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Stop generating"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        stopAI();
                      }}
                      title="Cancel"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        background: 'var(--text)',
                        border: '1px solid var(--line)',
                        padding: 0,
                        display: 'inline-block',
                        cursor: 'pointer',
                      }}
                    />
                  </span>
                )}
                <button
                  aria-label="Send"
                  type="submit"
                  disabled={(!draft.trim() && !selectedLessonPlanId && selectedResourceFileIds.length === 0) || sending}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {modal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${modal} window`}
          onClick={() => setModal(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modal}</h3>
              <button className="modal-close" onClick={() => setModal(null)} aria-label="Close">Close</button>
            </div>

            {modal === 'Calendar' ? (
              <div>
                <div className="calendar-layout">
                  <div className="calendar-stack">
                    <div className="calendar-section">
                      <div className="calendar-section-title">Events</div>
                      <div className="action-sub" style={{ marginBottom: 6 }}>
                        Selected date: {selectedDate || 'None'}
                      </div>
                      <div className="event-form">
                        <input
                          type="date"
                          value={eventDraft.date}
                          onChange={(e) => setEventDraft((p) => ({ ...p, date: e.target.value }))}
                          aria-label="Event date"
                        />
                        <input
                          placeholder="Event title"
                          value={eventDraft.title}
                          onChange={(e) => setEventDraft((p) => ({ ...p, title: e.target.value }))}
                          maxLength={300}
                          aria-label="Event title"
                        />
                        <button className="btn primary" type="button" onClick={addEvent}>Add Event</button>
                      </div>
                    </div>

                    <div className="calendar-section">
                      <div className="calendar-section-title">Classes</div>
                      <div className="event-form">
                        <input
                          type="date"
                          value={classDraft.date}
                          onChange={(e) => setClassDraft((p) => ({ ...p, date: e.target.value }))}
                          aria-label="Class date"
                        />
                        <input
                          placeholder="Class name"
                          value={classDraft.name}
                          onChange={(e) => setClassDraft((p) => ({ ...p, name: e.target.value }))}
                          maxLength={300}
                          aria-label="Class name"
                        />
                        <select
                          value={classDraft.timeFrom}
                          onChange={(e) => setClassDraft((p) => ({ ...p, timeFrom: e.target.value }))}
                          aria-label="Class time from"
                        >
                          <option value="">Time from</option>
                          {timeOptions.map((t) => (
                            <option key={`from-${t}`} value={t}>{t}</option>
                          ))}
                        </select>
                        <select
                          value={classDraft.timeTo}
                          onChange={(e) => setClassDraft((p) => ({ ...p, timeTo: e.target.value }))}
                          aria-label="Class time to"
                        >
                          <option value="">Time to</option>
                          {timeOptions.map((t) => (
                            <option key={`to-${t}`} value={t}>{t}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Room (optional)"
                          value={classDraft.room}
                          onChange={(e) => setClassDraft((p) => ({ ...p, room: e.target.value }))}
                          maxLength={300}
                          aria-label="Class room"
                        />
                        <button className="btn primary" type="button" onClick={addClass}>Add Class</button>
                      </div>
                      <div className="calendar-list">
                        {classes.length === 0 && (
                          <div className="event-item">No classes yet. Add a class to organize your week.</div>
                        )}
                        {classes.map((item, idx) => (
                          <div key={`${item.name}-${idx}`} className="event-item">
                            <strong>{item.name}</strong>
                            <div className="action-sub" style={{ marginTop: 6 }}>Date: {item.date}</div>
                            <div className="action-sub" style={{ marginTop: 6 }}>Time: {item.timeFrom} - {item.timeTo}</div>
                            {item.room && (
                              <div className="action-sub" style={{ marginTop: 4 }}>Room: {item.room}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>


                  </div>

                  <div className="calendar-panel">
                    <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ fontWeight: 700 }}>{monthNames[calendarMonth]} {calendarYear}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            if (calendarMonth === 0) {
                              setCalendarMonth(11);
                              setCalendarYear((y) => y - 1);
                            } else {
                              setCalendarMonth((m) => m - 1);
                            }
                          }}
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            if (calendarMonth === 11) {
                              setCalendarMonth(0);
                              setCalendarYear((y) => y + 1);
                            } else {
                              setCalendarMonth((m) => m + 1);
                            }
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                    <div className="calendar-grid" aria-label="Calendar grid">
                      {(() => {
                        const totalDays = getDaysInMonth(calendarYear, calendarMonth);
                        const now = new Date();
                        const todayStr = formatDate(now.getFullYear(), now.getMonth(), now.getDate());
                        const days = Array.from({ length: totalDays }, (_, i) => i + 1);
                        return (
                          <>
                            {days.map((day) => {
                              const date = formatDate(calendarYear, calendarMonth, day);
                        const dayEvents = events.filter((e) => e.date === date);
                        const dayClasses = classes.filter((c) => c.date === date);
                        const dayAssignments = assignments.filter((a) => a.dueDate === date);
                        return (
                          <button
                            type="button"
                            onClick={() => applySelectedDate(date)}
                            onDoubleClick={() => setDayDetailsDate(date)}
                            className={`calendar-cell${date === todayStr ? ' today' : ''}${selectedDate === date ? ' selected' : ''}`}
                            key={date}
                          >
                            <div style={{ fontWeight: 700 }}>{day}</div>
                            {(dayEvents.length > 0 || dayClasses.length > 0 || dayAssignments.length > 0) && (
                              <div className="calendar-dots" aria-label="Day items">
                                {dayEvents.length > 0 && <span className="calendar-dot event" />}
                                {dayClasses.length > 0 && <span className="calendar-dot class" />}
                                {dayAssignments.length > 0 && <span className="calendar-dot assignment" />}
                              </div>
                            )}
                          </button>
                            );
                          })}
                        </>
                        );
                      })()}
                    </div>
                    <div className="calendar-section" style={{ marginTop: 8 }}>
                      <div className="calendar-section-title">Assignments</div>
                      <div className="event-form">
                        <input
                          placeholder="Assignment title"
                          value={assignmentDraft.title}
                          onChange={(e) => setAssignmentDraft((p) => ({ ...p, title: e.target.value }))}
                          maxLength={300}
                          aria-label="Assignment title"
                        />
                        <input
                          type="date"
                          value={assignmentDraft.dueDate}
                          onChange={(e) => setAssignmentDraft((p) => ({ ...p, dueDate: e.target.value }))}
                          aria-label="Assignment due date"
                        />
                        <input
                          placeholder="Class (optional)"
                          value={assignmentDraft.className}
                          onChange={(e) => setAssignmentDraft((p) => ({ ...p, className: e.target.value }))}
                          maxLength={300}
                          aria-label="Assignment class"
                        />
                        <button className="btn primary" type="button" onClick={addAssignment}>Add Assignment</button>
                      </div>
                      <div className="calendar-list">
                        {assignments.length === 0 && (
                          <div className="event-item">No assignments yet. Add one to start tracking.</div>
                        )}
                        {assignments.map((item, idx) => (
                          <div key={`${item.title}-${idx}`} className="event-item">
                            <strong>{item.title}</strong>
                            <div className="action-sub" style={{ marginTop: 6 }}>Due: {item.dueDate}</div>
                            {item.className && (
                              <div className="action-sub" style={{ marginTop: 4 }}>Class: {item.className}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : modal === 'Resources' ? (
              <div>
                <p className="action-sub" style={{ marginBottom: 12 }}>{panelContent[modal]}</p>
                <div className="event-item" style={{ marginBottom: 10, fontWeight: 700 }}>Upload Files</div>
                <div 
                  className="event-form"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: isDragging ? '2px dashed var(--primary)' : '2px dashed transparent',
                    backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    padding: '16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ 
                    marginBottom: 12, 
                    padding: '12px', 
                    backgroundColor: 'rgba(59, 130, 246, 0.08)', 
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: 'var(--muted)'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--primary)' }}>📎 Upload Limits</div>
                    <div>• Max size: 5MB per file</div>
                    <div>• Formats: PDF, TXT, DOCX, XLSX</div>
                    <div>• Character limit: 500,000 per file</div>
                    <div style={{ marginTop: 8, fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                      📋 Selection Rules
                    </div>
                    <div style={{ marginTop: 4, fontSize: '12px' }}>
                      • Max 2 resource files per prompt
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      • OR 1 lesson plan + 1 resource file
                    </div>
                    <div style={{ marginTop: 8, fontStyle: 'italic' }}>
                      {isDragging ? '📂 Drop files here...' : '💡 Drag & drop files or click below to select'}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx,.xlsx"
                    onChange={(e) => setResourceUpload(e.target.files)}
                    aria-label="Upload resource files"
                    multiple
                  />
                  <button
                    className="btn primary"
                    type="button"
                    onClick={uploadResourceFile}
                    disabled={!resourceUpload || resourceUploading}
                  >
                    {resourceUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {resourceFiles.length === 0 && (
                    <div className="event-item">No files uploaded yet.</div>
                  )}
                  {resourceFiles.map((file) => {
                    const isSelected = selectedResourceFileIds.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleResourceSelect(file.id, isSelected)}
                          disabled={!isSelected && !canAddMoreFiles()}
                          className="event-item"
                          style={{
                            flex: 1,
                            textAlign: 'left',
                            borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined,
                            opacity: !isSelected && !canAddMoreFiles() ? 0.5 : 1,
                            cursor: !isSelected && !canAddMoreFiles() ? 'not-allowed' : 'pointer',
                          }}
                          title={!isSelected && !canAddMoreFiles() ? 'File limit reached' : ''}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1 }}>
                              <strong>{file.filename}</strong>
                              <div className="action-sub" style={{ marginTop: 6 }}>{file.filetype.toUpperCase()}</div>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteResourceFile(file.id)}
                          style={{
                            padding: '6px 8px',
                            borderColor: 'var(--border)',
                            background: 'var(--card)',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '16px',
                            minWidth: '32px',
                            border: '1px solid var(--line)',
                            borderRadius: '6px',
                          }}
                          title="Delete resource"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {selectedResourceFileIds.length > 0 && (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => setModal(null)}
                      style={{ marginTop: 8 }}
                    >
                      Use {selectedResourceFileIds.length} Selected File{selectedResourceFileIds.length > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            ) : modal === 'Lesson Plans' ? (
              <div>
                <p className="action-sub" style={{ marginBottom: 12 }}>{panelContent[modal]}</p>
                <div className="event-form">
                  <input
                    placeholder="Title"
                    value={lessonDraft.title}
                    onChange={(e) => setLessonDraft((p) => ({ ...p, title: e.target.value }))}
                    aria-label="Lesson title"
                  />
                  <textarea
                    placeholder="Example: Grade the attached math homework. Focus on showing where the student made mistakes, provide step-by-step corrections, and summarize common errors. Keep feedback concise and supportive."
                    value={lessonDraft.instructions}
                    onChange={(e) => setLessonDraft((p) => ({ ...p, instructions: e.target.value }))}
                    aria-label="Lesson instructions"
                    rows={4}
                  />
                  <select
                    value={lessonDraft.resourceFileId ?? ''}
                    onChange={(e) => setLessonDraft((p) => ({ ...p, resourceFileId: e.target.value ? Number(e.target.value) : undefined }))}
                    aria-label="Lesson resource file"
                  >
                    <option value="">Attach resource file (optional)</option>
                    {resourceFiles.map((file) => (
                      <option key={file.id} value={file.id}>{file.filename}</option>
                    ))}
                  </select>
                  <button className="btn primary" type="button" onClick={addLessonPlan}>Add Lesson Plan</button>
                </div>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {presetLessonPlans.length > 0 && (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginTop: 8 }}>
                        Preset Templates
                      </div>
                      {presetLessonPlans.map((item) => (
                        <div
                          key={item.id}
                          className="event-item"
                          style={{
                            textAlign: 'left',
                            borderColor: selectedLessonPlanId === item.id ? 'var(--primary)' : 'var(--border)',
                            display: 'grid',
                            gap: 8,
                            background: 'rgba(59, 130, 246, 0.05)',
                          }}
                        >
                          <strong>{item.title}</strong>
                          {item.instructions && (
                            <div className="action-sub" style={{ marginTop: 6 }}>{item.instructions}</div>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                setSelectedLessonPlanId(item.id);
                                setModal(null);
                              }}
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {lessonPlans.length > 0 && (
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginTop: 8 }}>
                      My Lesson Plans
                    </div>
                  )}
                  {lessonPlans.length === 0 && presetLessonPlans.length === 0 && (
                    <div className="event-item">No lesson plans yet. Add a blueprint to reuse later.</div>
                  )}
                  {lessonPlans.map((item) => (
                    <div
                      key={item.id}
                      className="event-item"
                      style={{
                        textAlign: 'left',
                        borderColor: selectedLessonPlanId === item.id ? 'var(--primary)' : 'var(--border)',
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      {editingLessonPlanId === item.id ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <input
                            value={lessonEditDraft.title}
                            onChange={(e) => setLessonEditDraft((p) => ({ ...p, title: e.target.value }))}
                            aria-label="Edit lesson title"
                          />
                          <textarea
                            value={lessonEditDraft.instructions}
                            onChange={(e) => setLessonEditDraft((p) => ({ ...p, instructions: e.target.value }))}
                            rows={3}
                            aria-label="Edit lesson instructions"
                          />
                          <select
                            value={lessonEditDraft.resourceFileId ?? ''}
                            onChange={(e) => setLessonEditDraft((p) => ({ ...p, resourceFileId: e.target.value ? Number(e.target.value) : undefined }))}
                            aria-label="Edit lesson resource file"
                          >
                            <option value="">Attach resource file (optional)</option>
                            {resourceFiles.map((file) => (
                              <option key={file.id} value={file.id}>{file.filename}</option>
                            ))}
                          </select>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn primary" type="button" onClick={() => saveLessonPlan(item.id)}>Save</button>
                            <button className="btn ghost" type="button" onClick={cancelEditLessonPlan}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <strong>{item.title}</strong>
                          {item.instructions && (
                            <div className="action-sub" style={{ marginTop: 6 }}>{item.instructions}</div>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                setSelectedLessonPlanId(item.id);
                                setModal(null);
                              }}
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => startEditLessonPlan(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => cloneLessonPlan(item)}
                              title="Clone this lesson plan"
                            >
                              📋 Clone
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={async () => {
                                try {
                                  await lessonPlanAPI.delete(Number(item.id));
                                  setLessonPlans((prev) => prev.filter((p) => p.id !== item.id));
                                  if (selectedLessonPlanId === item.id) {
                                    setSelectedLessonPlanId(null);
                                  }
                                  push('Lesson plan deleted', 'success');
                                } catch (error) {
                                  push('Failed to delete lesson plan', 'error');
                                }
                              }}
                              style={{ color: 'var(--danger)' }}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : modal === 'Preferences' ? (
              <div>
                <p className="action-sub" style={{ marginBottom: 12 }}>
                  Set your teaching context once, and it will be automatically included in all AI conversations.
                </p>
                <div className="event-form" style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Grade Level
                    </label>
                    <input
                      placeholder="e.g., Grade 5, High School, University"
                      value={preferencesDraft.gradeLevel}
                      onChange={(e) => setPreferencesDraft((p) => ({ ...p, gradeLevel: e.target.value }))}
                      aria-label="Grade level"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Curriculum Style
                    </label>
                    <input
                      placeholder="e.g., UK National, US Common Core, IB, CAPS"
                      value={preferencesDraft.curriculum}
                      onChange={(e) => setPreferencesDraft((p) => ({ ...p, curriculum: e.target.value }))}
                      aria-label="Curriculum"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Class Size
                    </label>
                    <input
                      placeholder="e.g., 15-20 students, 30+ students"
                      value={preferencesDraft.classSize}
                      onChange={(e) => setPreferencesDraft((p) => ({ ...p, classSize: e.target.value }))}
                      aria-label="Class size"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Teaching Style
                    </label>
                    <input
                      placeholder="e.g., Project-based, Exam-focused, Montessori"
                      value={preferencesDraft.teachingStyle}
                      onChange={(e) => setPreferencesDraft((p) => ({ ...p, teachingStyle: e.target.value }))}
                      aria-label="Teaching style"
                    />
                  </div>
                  <button 
                    className="btn primary" 
                    type="button" 
                    onClick={savePreferences}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            ) : modal === 'Select Lesson Plans' ? (
              <div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {presetLessonPlans.length > 0 && (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
                        Preset Templates
                      </div>
                      {presetLessonPlans.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedLessonPlanId(item.id);
                            setModal(null);
                          }}
                          className="event-item"
                          style={{
                            textAlign: 'left',
                            borderColor: selectedLessonPlanId === item.id ? 'var(--primary)' : 'var(--border)',
                            background: 'rgba(59, 130, 246, 0.05)',
                          }}
                        >
                          <strong>{item.title}</strong>
                          {item.instructions && (
                            <div className="action-sub" style={{ marginTop: 6 }}>{item.instructions.substring(0, 80)}...</div>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                  
                  {lessonPlans.length > 0 && (
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginTop: 8 }}>
                      My Lesson Plans
                    </div>
                  )}
                  {lessonPlans.length === 0 && presetLessonPlans.length === 0 && (
                    <div className="event-item">No lesson plans yet. Create one from the Lesson Plans panel.</div>
                  )}
                  {lessonPlans.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedLessonPlanId(item.id);
                        setModal(null);
                      }}
                      className="event-item"
                      style={{
                        textAlign: 'left',
                        borderColor: selectedLessonPlanId === item.id ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      <strong>{item.title}</strong>
                      {item.instructions && (
                        <div className="action-sub" style={{ marginTop: 6 }}>{item.instructions.substring(0, 80)}...</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : modal === 'Notes' ? (
              <div>
                <div className="notes-layout">
                  <div className="notes-sidebar">
                    <input
                      className="notes-input"
                      placeholder="New note title"
                      value={noteTitleDraft}
                      onChange={(e) => setNoteTitleDraft(e.target.value)}
                      aria-label="Note title"
                    />
                    <button className="notes-add" type="button" onClick={addNote}>Add Page</button>
                    <div className="notes-list">
                      {notes.length === 0 && (
                        <div className="notes-empty">No notes yet.</div>
                      )}
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className={`notes-item${selectedNoteId === note.id ? ' active' : ''}`}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedNoteId(note.id)}
                            className="notes-item-button"
                          >
                            {note.title}
                          </button>
                          <button
                            type="button"
                            className="notes-delete"
                            onClick={() => deleteNote(note.id)}
                            aria-label={`Delete ${note.title}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="notes-editor">
                    {selectedNote ? (
                      <>
                        <div className="notes-title">{selectedNote.title}</div>
                        <div className="notes-date">{new Date(selectedNote.updatedAt).toLocaleString()}</div>
                        <textarea
                          className="notes-textarea"
                          placeholder="Write your note..."
                          value={selectedNote.content}
                          onChange={(e) => updateSelectedNoteContent(e.target.value)}
                          aria-label="Note content"
                          rows={12}
                        />
                      </>
                    ) : (
                      <div className="event-item">Select a note to edit.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="action-sub" style={{ marginBottom: 12 }}>{panelContent[modal]}</p>
                <div className="event-item">This is a placeholder workspace for {modal}. Add more tools here later.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {dayDetailsDate && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Day details"
          onClick={() => setDayDetailsDate(null)}
        >
          <div className="modal day-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Day Details</h3>
              <button className="modal-close" onClick={() => setDayDetailsDate(null)} aria-label="Close">Close</button>
            </div>
            <div className="action-sub" style={{ marginBottom: 10 }}>{dayDetailsDate}</div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <strong>Events</strong>
                <div className="calendar-list" style={{ marginTop: 8 }}>
                  {events.filter((e) => e.date === dayDetailsDate).length === 0 && (
                    <div className="event-item">No events for this date.</div>
                  )}
                  {events.filter((e) => e.date === dayDetailsDate).map((ev, idx) => (
                    <div key={`day-ev-${idx}`} className="event-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>{ev.title}</div>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={async () => {
                          await calendarEventsAPI.delete(ev.id);
                          setEvents((prev) => prev.filter((e) => e.id !== ev.id));
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        aria-label="Delete event"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <strong>Classes</strong>
                <div className="calendar-list" style={{ marginTop: 8 }}>
                  {classes.filter((c) => c.date === dayDetailsDate).length === 0 && (
                    <div className="event-item">No classes for this date.</div>
                  )}
                  {classes.filter((c) => c.date === dayDetailsDate).map((cls, idx) => (
                    <div key={`day-class-${idx}`} className="event-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <strong>{cls.name}</strong>
                          <div className="action-sub" style={{ marginTop: 6 }}>Time: {cls.timeFrom} - {cls.timeTo}</div>
                          {cls.room && (
                            <div className="action-sub" style={{ marginTop: 4 }}>Room: {cls.room}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={async () => {
                            await calendarClassesAPI.delete(cls.id);
                            setClasses((prev) => prev.filter((c) => c.id !== cls.id));
                          }}
                          style={{ padding: '4px 8px', fontSize: '12px', flexShrink: 0 }}
                          aria-label="Delete class"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <strong>Assignments</strong>
                <div className="calendar-list" style={{ marginTop: 8 }}>
                  {assignments.filter((a) => a.dueDate === dayDetailsDate).length === 0 && (
                    <div className="event-item">No assignments due on this date.</div>
                  )}
                  {assignments.filter((a) => a.dueDate === dayDetailsDate).map((a, idx) => (
                    <div key={`day-assignment-${idx}`} className="event-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <strong>{a.title}</strong>
                          {a.className && (
                            <div className="action-sub" style={{ marginTop: 6 }}>Class: {a.className}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={async () => {
                            await assignmentsAPI.delete(a.id);
                            setAssignments((prev) => prev.filter((item) => item.id !== a.id));
                          }}
                          style={{ padding: '4px 8px', fontSize: '12px', flexShrink: 0 }}
                          aria-label="Delete assignment"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      
      <ToastStack toasts={toasts} onClose={remove} />
    </section>
  );
};

export default ChatPage;
