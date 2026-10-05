import PieChart from "@/components/PieChart";
import { CategoryColors, Colors, ExpenseCategories, type ExpenseCategory } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PersonalExpense = {
  id: number;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  spent_at: string;
  shared_expense_id: number | null;
};

type ExpenseUpdate = {
  category: ExpenseCategory;
  amount: number;
  description: string | null;
};

type MyGroup = {
  id: number;
  name: string;
};

const OVERALL = 'Overall';
const BUDGET_KEYS: string[] = [OVERALL, ...ExpenseCategories];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Weeks run Monday–Sunday in local time.
function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function weekKey(date: Date) {
  const s = startOfWeek(date);
  const mm = String(s.getMonth() + 1).padStart(2, '0');
  const dd = String(s.getDate()).padStart(2, '0');
  return `${s.getFullYear()}-${mm}-${dd}`;
}

function weekLabel(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}`;
}

function budgetColor(spent: number, limit: number) {
  const ratio = spent / limit;
  if (ratio > 1) {
    return Colors.danger;
  }
  if (ratio >= 0.8) {
    return Colors.accent;
  }
  return Colors.success;
}

function BudgetBar({ label, spent, limit }: { label: string; spent: number; limit: number }) {
  const ratio = limit > 0 ? spent / limit : 0;
  const color = budgetColor(spent, limit);
  const over = spent - limit;
  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetHeader}>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={styles.legendAmount}>
          ${spent.toFixed(2)} of ${limit.toFixed(2)}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: color }]} />
      </View>
      {over > 0 && (
        <Text style={[styles.overText, { color: Colors.danger }]}>Over by ${over.toFixed(2)}</Text>
      )}
    </View>
  );
}

function ExpenseRow({
  expense,
  isEditing,
  locked,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onShare,
}: {
  expense: PersonalExpense;
  isEditing: boolean;
  locked: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: ExpenseUpdate) => Promise<void>;
  onDelete: () => void;
  onShare: () => void;
}) {
  const shared = expense.shared_expense_id !== null;
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [amount, setAmount] = useState(String(expense.amount));
  const [description, setDescription] = useState(expense.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setDescription(expense.description ?? '');
    }
  }, [isEditing, expense]);

  if (!isEditing) {
    return (
      <View style={styles.expenseRow}>
        <View style={[styles.legendSwatch, { backgroundColor: CategoryColors[expense.category] }]} />
        <View style={styles.expenseRowMain}>
          <Text style={styles.expenseRowTitle}>{expense.category}</Text>
          {expense.description ? (
            <Text style={styles.expenseRowDesc}>{expense.description}</Text>
          ) : null}
          <Text style={styles.expenseRowDate}>
            {new Date(expense.spent_at).toLocaleDateString()}
            {shared ? ' · Shared with group' : ''}
          </Text>
        </View>
        <Text style={styles.expenseRowAmount}>${expense.amount.toFixed(2)}</Text>
        {!locked && !shared && (
          <>
            <Pressable onPress={onShare} hitSlop={8} style={styles.rowIconButton}>
              <Ionicons name="people-outline" size={18} color={Colors.accent} />
            </Pressable>
            <Pressable onPress={onStartEdit} hitSlop={8} style={styles.rowIconButton}>
              <Ionicons name="pencil-outline" size={18} color={Colors.accent} />
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8} style={styles.rowIconButton}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.expenseEditRow}>
      <View style={styles.categoryRow}>
        {ExpenseCategories.map((cat) => {
          const selected = cat === category;
          return (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selected ? CategoryColors[cat] : Colors.surfaceAlt,
                  borderColor: CategoryColors[cat],
                },
              ]}
            >
              <Text style={[styles.categoryChipText, selected && { color: Colors.background }]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount"
        placeholderTextColor={Colors.textPlaceholder}
      />
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        placeholderTextColor={Colors.textPlaceholder}
      />

      <View style={styles.editActionsRow}>
        <Pressable style={styles.cancelButton} onPress={onCancelEdit}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, saving && styles.submitButtonDisabled]}
          disabled={saving}
          onPress={async () => {
            const numericAmount = parseFloat(amount);
            if (!numericAmount || numericAmount <= 0) {
              return;
            }
            setSaving(true);
            await onSave({ category, amount: numericAmount, description: description.trim() || null });
            setSaving(false);
          }}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ExpensesScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);

  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({});
  const [savingBudgets, setSavingBudgets] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const [shareTarget, setShareTarget] = useState<PersonalExpense | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const currentWeekKey = weekKey(new Date());

  const fetchExpenses = useCallback(async () => {
    if (!session) {
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('personal_expenses')
      .select('id, category, description, amount, spent_at, shared_expense_id')
      .eq('user_id', session.user.id)
      .order('spent_at', { ascending: false });

    if (!fetchError && data) {
      setExpenses(data.map((row) => ({ ...row, amount: Number(row.amount) })));
    }
    setIsLoading(false);
  }, [session]);

  const fetchBudgets = useCallback(async () => {
    if (!session) {
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('weekly_budgets')
      .select('category, amount')
      .eq('user_id', session.user.id);

    if (!fetchError && data) {
      const map: Record<string, number> = {};
      for (const row of data as { category: string; amount: number }[]) {
        map[row.category] = Number(row.amount);
      }
      setBudgets(map);
    }
  }, [session]);

  const fetchMyGroups = useCallback(async () => {
    if (!session) {
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('group_members')
      .select('groups(id, name)')
      .eq('user_id', session.user.id);

    if (!fetchError && data) {
      const rows = data as unknown as { groups: MyGroup }[];
      setMyGroups(rows.map((row) => row.groups));
    }
  }, [session]);

  useEffect(() => {
    fetchExpenses();
    fetchBudgets();
    fetchMyGroups();
  }, [fetchExpenses, fetchBudgets, fetchMyGroups]);

  // Every week that has expenses, plus the current week (even when empty), newest first.
  const weeks = useMemo(() => {
    const byWeek = new Map<string, PersonalExpense[]>([[currentWeekKey, []]]);
    for (const expense of expenses) {
      const key = weekKey(new Date(expense.spent_at));
      byWeek.set(key, [...(byWeek.get(key) ?? []), expense]);
    }
    return Array.from(byWeek.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, items]) => ({
        key,
        items,
        total: items.reduce((sum, e) => sum + e.amount, 0),
      }));
  }, [expenses, currentWeekKey]);

  const currentWeek = weeks.find((w) => w.key === currentWeekKey)!;
  const selectedWeek = weeks.find((w) => w.key === selectedWeekKey);
  const selectedIsCurrent = selectedWeekKey === currentWeekKey;

  // The chart shows only the current week; fixed category order keeps colors stable.
  const totalsByCategory = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const expense of currentWeek.items) {
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    }
    return ExpenseCategories.map((cat) => ({ category: cat, total: totals.get(cat) ?? 0 })).filter(
      (entry) => entry.total > 0
    );
  }, [currentWeek]);

  const grandTotal = totalsByCategory.reduce((sum, entry) => sum + entry.total, 0);

  const spentFor = (key: string) =>
    key === OVERALL
      ? currentWeek.total
      : currentWeek.items
          .filter((e) => e.category === key)
          .reduce((sum, e) => sum + e.amount, 0);

  const budgetKeysSet = BUDGET_KEYS.filter((key) => budgets[key] !== undefined);

  const openBudgetModal = () => {
    const draft: Record<string, string> = {};
    for (const key of BUDGET_KEYS) {
      draft[key] = budgets[key] !== undefined ? String(budgets[key]) : '';
    }
    setBudgetDraft(draft);
    setBudgetModalVisible(true);
  };

  const handleSaveBudgets = async () => {
    if (!session) {
      return;
    }
    setSavingBudgets(true);
    setBudgetError(null);

    const results = await Promise.all(
      BUDGET_KEYS.map(async (key) => {
        const value = parseFloat(budgetDraft[key] ?? '');
        if (value > 0) {
          const { error: saveError } = await supabase.from('weekly_budgets').upsert(
            { user_id: session.user.id, category: key, amount: value },
            { onConflict: 'user_id,category' }
          );
          return saveError?.message ?? null;
        }
        if (budgets[key] !== undefined) {
          const { error: deleteError } = await supabase
            .from('weekly_budgets')
            .delete()
            .eq('user_id', session.user.id)
            .eq('category', key);
          return deleteError?.message ?? null;
        }
        return null;
      })
    );
    setSavingBudgets(false);

    const firstError = results.find((message) => message !== null);
    if (firstError) {
      setBudgetError(firstError);
      return;
    }
    setBudgetModalVisible(false);
    fetchBudgets();
  };


  const handleAddExpense = async () => {
    setError(null);
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from('personal_expenses').insert({
      user_id: session!.user.id,
      category,
      amount: numericAmount,
      description: description.trim() || null,
    });
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAmount('');
    setDescription('');
    fetchExpenses();
    fetchBudgets();
  };

  const handleUpdateExpense = async (id: number, updates: ExpenseUpdate) => {
    const { error: updateError } = await supabase
      .from('personal_expenses')
      .update(updates)
      .eq('id', id);

    if (!updateError) {
      setEditingId(null);
      fetchExpenses();
    }
  };

  const handleDeleteExpense = (id: number) => {
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('personal_expenses').delete().eq('id', id);
          fetchExpenses();
        },
      },
    ]);
  };

  const handleShare = async (group: MyGroup) => {
    if (!shareTarget || !session) {
      return;
    }
    setShareStatus('Sharing...');

    const { data: memberRows, error: memberError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id);
    if (memberError || !memberRows || memberRows.length === 0) {
      setShareStatus('Could not load the group members.');
      return;
    }
    const userIds = (memberRows as { user_id: string }[]).map((m) => m.user_id);

    // Split in whole cents; the first few members absorb the leftover cents.
    const totalCents = Math.round(shareTarget.amount * 100);
    const baseCents = Math.floor(totalCents / userIds.length);
    const remainderCents = totalCents - baseCents * userIds.length;
    const splits = userIds.map((userId, i) => ({
      user_id: userId,
      amount: (baseCents + (i < remainderCents ? 1 : 0)) / 100,
    }));

    const description = `${shareTarget.category}${shareTarget.description ? ` – ${shareTarget.description}` : ''}`;
    const { data: created, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: group.id,
        paid_by: session.user.id,
        description,
        amount: shareTarget.amount,
      })
      .select('id')
      .single();
    if (expenseError || !created) {
      setShareStatus(expenseError?.message ?? 'Could not create the shared expense.');
      return;
    }
    const expenseId = (created as { id: number }).id;

    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(splits.map((s) => ({ ...s, expense_id: expenseId })));
    if (splitError) {
      setShareStatus(splitError.message);
      return;
    }

    const { error: linkError } = await supabase
      .from('personal_expenses')
      .update({ shared_expense_id: expenseId })
      .eq('id', shareTarget.id);
    if (linkError) {
      setShareStatus(linkError.message);
      return;
    }

    setShareTarget(null);
    setShareStatus(null);
    fetchExpenses();
  };

  const openWeek = (key: string) => {
    setEditingId(null);
    setSelectedWeekKey(key);
  };

  return (
    <>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
    >
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={styles.title}>Expenses</Text>

      <View style={styles.chartCard}>
        <Text style={styles.sectionLabel}>This week · {weekLabel(currentWeekKey)}</Text>
        {isLoading ? (
          <Text style={styles.mutedText}>Loading...</Text>
        ) : grandTotal > 0 ? (
          <>
            <PieChart
              size={200}
              gapColor={Colors.surface}
              data={totalsByCategory.map((entry) => ({
                key: entry.category,
                value: entry.total,
                color: CategoryColors[entry.category],
              }))}
            />
            <Text style={styles.totalText}>${grandTotal.toFixed(2)} this week</Text>

            <View style={styles.legend}>
              {totalsByCategory.map((entry) => (
                <View key={entry.category} style={styles.legendRow}>
                  <View
                    style={[styles.legendSwatch, { backgroundColor: CategoryColors[entry.category] }]}
                  />
                  <Text style={styles.legendLabel}>{entry.category}</Text>
                  <Text style={styles.legendAmount}>
                    ${entry.total.toFixed(2)} · {((entry.total / grandTotal) * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.mutedText}>No expenses this week — add one below.</Text>
        )}
      </View>

      <View style={styles.weeksCard}>
        <View style={styles.budgetTitleRow}>
          <Text style={styles.formTitle}>Weekly budgets</Text>
          <Pressable onPress={openBudgetModal} hitSlop={8}>
            <Text style={styles.linkText}>Set budgets</Text>
          </Pressable>
        </View>
        {budgetKeysSet.length === 0 ? (
          <Text style={styles.mutedText}>No budgets set. Tap "Set budgets" to add weekly limits.</Text>
        ) : (
          budgetKeysSet.map((key) => (
            <BudgetBar
              key={key}
              label={key === OVERALL ? 'Overall' : key}
              spent={spentFor(key)}
              limit={budgets[key]}
            />
          ))
        )}
      </View>

      <Pressable style={styles.manageButton} onPress={() => openWeek(currentWeekKey)}>
        <Ionicons name="list-outline" size={18} color={Colors.accent} />
        <Text style={styles.manageButtonText}>Manage This Week</Text>
      </Pressable>

      <View style={styles.weeksCard}>
        <Text style={styles.formTitle}>Weekly Logs</Text>
        {weeks.map((week) => {
          const isCurrent = week.key === currentWeekKey;
          return (
            <Pressable key={week.key} style={styles.weekRow} onPress={() => openWeek(week.key)}>
              <View style={styles.expenseRowMain}>
                <Text style={styles.expenseRowTitle}>{weekLabel(week.key)}</Text>
                <Text style={styles.expenseRowDesc}>
                  {week.items.length} {week.items.length === 1 ? 'expense' : 'expenses'}
                  {isCurrent ? ' · current' : ' · locked'}
                </Text>
              </View>
              <Text style={styles.expenseRowAmount}>${week.total.toFixed(2)}</Text>
              <Ionicons
                name={isCurrent ? 'chevron-forward' : 'lock-closed-outline'}
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Add Expense</Text>

        <View style={styles.categoryRow}>
          {ExpenseCategories.map((cat) => {
            const selected = cat === category;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selected ? CategoryColors[cat] : Colors.surfaceAlt,
                    borderColor: CategoryColors[cat],
                  },
                ]}
              >
                <Text
                  style={[styles.categoryChipText, selected && { color: Colors.background }]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inputWrapper}>
          {amount.length === 0 && (
            <Text style={styles.placeholderOverlay} pointerEvents="none">
              Amount
            </Text>
          )}
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View style={styles.inputWrapper}>
          {description.length === 0 && (
            <Text style={styles.placeholderOverlay} pointerEvents="none">
              Description (optional)
            </Text>
          )}
          <TextInput style={styles.input} value={description} onChangeText={setDescription} />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleAddExpense}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Adding...' : 'Add Expense'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>

    <Modal
      visible={selectedWeekKey !== null}
      animationType="slide"
      transparent
      onRequestClose={() => setSelectedWeekKey(null)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedWeekKey(null)} />
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {selectedWeekKey ? weekLabel(selectedWeekKey) : ''}
              </Text>
              <Text style={styles.expenseRowDesc}>
                {selectedIsCurrent ? 'Current week · editable' : 'Locked week · read-only'}
              </Text>
            </View>
            <Pressable onPress={() => setSelectedWeekKey(null)} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
            {!selectedWeek || selectedWeek.items.length === 0 ? (
              <Text style={styles.mutedText}>No expenses in this week.</Text>
            ) : (
              selectedWeek.items.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  isEditing={selectedIsCurrent && editingId === expense.id}
                  locked={!selectedIsCurrent}
                  onStartEdit={() => setEditingId(expense.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(updates) => handleUpdateExpense(expense.id, updates)}
                  onDelete={() => handleDeleteExpense(expense.id)}
                  onShare={() => {
                    // Close the week sheet first so the share sheet isn't nested inside it.
                    setSelectedWeekKey(null);
                    setShareStatus(null);
                    setShareTarget(expense);
                  }}
                />
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal
      visible={budgetModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setBudgetModalVisible(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Weekly budgets</Text>
            <Pressable onPress={() => setBudgetModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          <Text style={styles.mutedText}>Leave a field empty for no limit.</Text>
          {budgetError && <Text style={styles.errorText}>{budgetError}</Text>}

          <ScrollView style={styles.budgetList} keyboardShouldPersistTaps="handled">
            {BUDGET_KEYS.map((key) => (
              <View key={key} style={styles.budgetInputRow}>
                <Text style={[styles.legendLabel, key === OVERALL && styles.overallLabel]}>
                  {key === OVERALL ? 'Overall' : key}
                </Text>
                <TextInput
                  style={styles.budgetInput}
                  keyboardType="decimal-pad"
                  placeholder="No limit"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={budgetDraft[key] ?? ''}
                  onChangeText={(value) => setBudgetDraft((prev) => ({ ...prev, [key]: value }))}
                />
              </View>
            ))}
          </ScrollView>

          <Pressable
            style={[styles.submitButton, savingBudgets && styles.submitButtonDisabled]}
            disabled={savingBudgets}
            onPress={handleSaveBudgets}
          >
            <Text style={styles.submitButtonText}>{savingBudgets ? 'Saving...' : 'Save Budgets'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal
      visible={shareTarget !== null}
      animationType="slide"
      transparent
      onRequestClose={() => setShareTarget(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Share with a group</Text>
              {shareTarget && (
                <Text style={styles.expenseRowDesc}>
                  ${shareTarget.amount.toFixed(2)} {shareTarget.category} · split equally
                </Text>
              )}
            </View>
            <Pressable onPress={() => setShareTarget(null)} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          {myGroups.length === 0 ? (
            <Text style={styles.mutedText}>You're not in any groups yet. Create one on the Groups tab first.</Text>
          ) : (
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {myGroups.map((group) => (
                <Pressable key={group.id} style={styles.weekRow} onPress={() => handleShare(group)}>
                  <Ionicons name="people-outline" size={20} color={Colors.accent} />
                  <Text style={[styles.expenseRowTitle, { flex: 1 }]}>{group.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {shareStatus && <Text style={styles.errorText}>{shareStatus}</Text>}
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontFamily: 'system-ui',
    fontSize: 13,
    alignSelf: 'flex-start',
  },
  mutedText: {
    color: Colors.textMuted,
    fontFamily: 'system-ui',
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  totalText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  legend: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'system-ui',
  },
  legendAmount: {
    color: Colors.textMuted,
    fontFamily: 'system-ui',
    fontSize: 13,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    color: Colors.accent,
    fontFamily: 'system-ui',
    fontWeight: 'bold',
    fontSize: 14,
  },
  budgetRow: {
    gap: 6,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  overText: {
    fontSize: 12,
    fontFamily: 'system-ui',
    fontWeight: 'bold',
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  overallLabel: {
    fontWeight: 'bold',
  },
  budgetInput: {
    width: 120,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'right',
    fontFamily: 'system-ui',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingVertical: 12,
  },
  manageButtonText: {
    color: Colors.accent,
    fontFamily: 'system-ui',
    fontWeight: 'bold',
    fontSize: 15,
  },
  weeksCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  formTitle: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipText: {
    color: Colors.text,
    fontFamily: 'system-ui',
    fontSize: 13,
  },
  inputWrapper: {
    position: 'relative',
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  placeholderOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    bottom: 0,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPlaceholder,
    opacity: 0.6,
    fontStyle: 'italic',
    fontFamily: 'system-ui',
  },
  input: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'system-ui',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  modalList: {
    flexGrow: 0,
  },
  budgetList: {
    flexShrink: 1,
    minHeight: 0,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  expenseRowMain: {
    flex: 1,
    gap: 2,
  },
  expenseRowTitle: {
    color: Colors.text,
    fontFamily: 'system-ui',
    fontWeight: 'bold',
    fontSize: 15,
  },
  expenseRowDesc: {
    color: Colors.textMuted,
    fontFamily: 'system-ui',
    fontSize: 13,
  },
  expenseRowDate: {
    color: Colors.textMuted,
    fontFamily: 'system-ui',
    fontSize: 11,
  },
  expenseRowAmount: {
    color: Colors.text,
    fontFamily: 'system-ui',
    fontWeight: 'bold',
    fontSize: 15,
  },
  rowIconButton: {
    padding: 4,
  },
  expenseEditRow: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  cancelButtonText: {
    color: Colors.textMuted,
    fontFamily: 'system-ui',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.accent,
  },
  saveButtonText: {
    color: Colors.background,
    fontFamily: 'system-ui',
    fontWeight: 'bold',
  },
});
