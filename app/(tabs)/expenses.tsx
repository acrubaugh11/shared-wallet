import PieChart from "@/components/PieChart";
import { CategoryColors, Colors, ExpenseCategories, type ExpenseCategory } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
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

  return (
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
});
