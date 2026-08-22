import PieChart from "@/components/PieChart";
import { CategoryColors, Colors, ExpenseCategories, type ExpenseCategory } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
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
};

type ExpenseUpdate = {
  category: ExpenseCategory;
  amount: number;
  description: string | null;
};

function ExpenseRow({
  expense,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  expense: PersonalExpense;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: ExpenseUpdate) => Promise<void>;
  onDelete: () => void;
}) {
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
          </Text>
        </View>
        <Text style={styles.expenseRowAmount}>${expense.amount.toFixed(2)}</Text>
        <Pressable onPress={onStartEdit} hitSlop={8} style={styles.rowIconButton}>
          <Ionicons name="pencil-outline" size={18} color={Colors.accent} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.rowIconButton}>
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </Pressable>
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

  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manageVisible, setManageVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!session) {
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('personal_expenses')
      .select('id, category, description, amount, spent_at')
      .eq('user_id', session.user.id)
      .order('spent_at', { ascending: false });

    if (!fetchError && data) {
      setExpenses(
        data.map((row) => ({ ...row, amount: Number(row.amount) }))
      );
    }
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const totalsByCategory = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const expense of expenses) {
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    }
    // Fixed category order, never re-sorted by value — keeps each category's
    // color/position stable regardless of which categories currently have data.
    return ExpenseCategories.map((cat) => ({ category: cat, total: totals.get(cat) ?? 0 })).filter(
      (entry) => entry.total > 0
    );
  }, [expenses]);

  const grandTotal = totalsByCategory.reduce((sum, entry) => sum + entry.total, 0);

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
            <Text style={styles.totalText}>${grandTotal.toFixed(2)} total</Text>

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
          <Text style={styles.mutedText}>No expenses yet — add one below.</Text>
        )}
      </View>

      <Pressable
        style={styles.manageButton}
        onPress={() => {
          setEditingId(null);
          setManageVisible(true);
        }}
      >
        <Ionicons name="list-outline" size={18} color={Colors.accent} />
        <Text style={styles.manageButtonText}>Manage Expenses</Text>
      </Pressable>

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
      visible={manageVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setManageVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Your Expenses</Text>
            <Pressable onPress={() => setManageVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
            {expenses.length === 0 ? (
              <Text style={styles.mutedText}>No expenses logged yet.</Text>
            ) : (
              expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  isEditing={editingId === expense.id}
                  onStartEdit={() => setEditingId(expense.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(updates) => handleUpdateExpense(expense.id, updates)}
                  onDelete={() => handleDeleteExpense(expense.id)}
                />
              ))
            )}
          </ScrollView>
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
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
