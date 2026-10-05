import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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

type Group = {
  id: number;
  name: string;
  role: string;
};

type Member = {
  user_id: string;
  role: string;
  display_name: string | null;
};

type Invite = {
  id: number;
  group_id: number;
  group_name: string;
  invited_by_name: string | null;
};

type Transfer = {
  from: string;
  to: string;
  cents: number;
};

// Who owes whom, with the fewest payments needed to settle everyone up.
function suggestTransfers(net: Record<string, number>): Transfer[] {
  const debtors = Object.entries(net)
    .filter(([, cents]) => cents < 0)
    .map(([id, cents]) => ({ id, cents: -cents }))
    .sort((a, b) => b.cents - a.cents);
  const creditors = Object.entries(net)
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => ({ id, cents }))
    .sort((a, b) => b.cents - a.cents);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, cents: pay });
    debtors[i].cents -= pay;
    creditors[j].cents -= pay;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }
  return transfers;
}

const toCents = (amount: number) => Math.round(amount * 100);

export default function GroupScreen() {
  const { session, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<{ paid_by: string; amount: number }[]>([]);
  const [groupSplits, setGroupSplits] = useState<{ user_id: string; amount: number }[]>([]);
  const [settlements, setSettlements] = useState<{ from_user: string; to_user: string; amount: number }[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!session) {
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('group_members')
      .select('role, groups(id, name)')
      .eq('user_id', session.user.id);

    if (!fetchError && data) {
      const rows = data as unknown as { role: string; groups: { id: number; name: string } }[];
      setGroups(rows.map((row) => ({ id: row.groups.id, name: row.groups.name, role: row.role })));
    }
  }, [session]);

  const fetchInvites = useCallback(async () => {
    if (!session) {
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('group_invites')
      .select('id, group_id, group_name, invited_by_name')
      .eq('invited_user_id', session.user.id)
      .eq('status', 'pending');

    if (!fetchError && data) {
      setInvites(data as Invite[]);
    }
  }, [session]);

  const fetchMembers = useCallback(async (groupId: number) => {
    const { data, error: fetchError } = await supabase
      .from('group_members')
      .select('user_id, role, profiles(display_name)')
      .eq('group_id', groupId);

    if (!fetchError && data) {
      const rows = data as unknown as {
        user_id: string;
        role: string;
        profiles: { display_name: string | null } | null;
      }[];
      setMembers(
        rows.map((row) => ({
          user_id: row.user_id,
          role: row.role,
          display_name: row.profiles?.display_name ?? null,
        }))
      );
    }
  }, []);

  const fetchBalanceData = useCallback(async (groupId: number) => {
    const [expensesResult, splitsResult, settlementsResult] = await Promise.all([
      supabase.from('expenses').select('paid_by, amount').eq('group_id', groupId),
      supabase
        .from('expense_splits')
        .select('user_id, amount, expenses!inner(group_id)')
        .eq('expenses.group_id', groupId),
      supabase.from('group_settlements').select('from_user, to_user, amount').eq('group_id', groupId),
    ]);

    if (!expensesResult.error && expensesResult.data) {
      setGroupExpenses(
        (expensesResult.data as { paid_by: string; amount: number }[]).map((row) => ({
          paid_by: row.paid_by,
          amount: Number(row.amount),
        }))
      );
    }
    if (!splitsResult.error && splitsResult.data) {
      setGroupSplits(
        (splitsResult.data as { user_id: string; amount: number }[]).map((row) => ({
          user_id: row.user_id,
          amount: Number(row.amount),
        }))
      );
    }
    if (!settlementsResult.error && settlementsResult.data) {
      setSettlements(
        (settlementsResult.data as { from_user: string; to_user: string; amount: number }[]).map((row) => ({
          ...row,
          amount: Number(row.amount),
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, [fetchGroups, fetchInvites]);

  // Net position per person in cents: positive is owed to them, negative is what they owe.
  const net = useMemo(() => {
    const totals: Record<string, number> = {};
    const add = (id: string, cents: number) => {
      totals[id] = (totals[id] ?? 0) + cents;
    };
    for (const expense of groupExpenses) {
      add(expense.paid_by, toCents(expense.amount));
    }
    for (const split of groupSplits) {
      add(split.user_id, -toCents(split.amount));
    }
    for (const settlement of settlements) {
      add(settlement.from_user, toCents(settlement.amount));
      add(settlement.to_user, -toCents(settlement.amount));
    }
    return totals;
  }, [groupExpenses, groupSplits, settlements]);

  const transfers = useMemo(() => suggestTransfers(net), [net]);

  const nameOf = (userId: string) =>
    userId === session?.user.id
      ? 'You'
      : members.find((m) => m.user_id === userId)?.display_name ?? 'Someone';

  const handleCreateGroup = async () => {
    const name = newName.trim();
    if (!name || !session) {
      setError('Enter a group name.');
      return;
    }
    setError(null);
    const { error: insertError } = await supabase
      .from('groups')
      .insert({ name, created_by: session.user.id });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewName('');
    fetchGroups();
  };

  const acceptInvite = async (invite: Invite) => {
    if (!session) {
      return;
    }
    const { error: joinError } = await supabase
      .from('group_members')
      .insert({ group_id: invite.group_id, user_id: session.user.id, role: 'member' });
    if (joinError) {
      setError(joinError.message);
      return;
    }
    await supabase.from('group_invites').update({ status: 'accepted' }).eq('id', invite.id);
    fetchGroups();
    fetchInvites();
  };

  const declineInvite = async (invite: Invite) => {
    await supabase.from('group_invites').update({ status: 'declined' }).eq('id', invite.id);
    fetchInvites();
  };

  const openGroup = (group: Group) => {
    setSelected(group);
    setInviteEmail('');
    setInviteStatus(null);
    fetchMembers(group.id);
    fetchBalanceData(group.id);
  };

  const handleInvite = async () => {
    if (!selected || !session) {
      return;
    }
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteStatus('Enter an email address.');
      return;
    }
    setInviteStatus(null);

    const { data, error: lookupError } = await supabase.rpc('find_profile_by_email', {
      lookup_email: email,
    });
    if (lookupError) {
      setInviteStatus(lookupError.message);
      return;
    }
    const found = (data as { id: string; display_name: string | null }[] | null)?.[0];
    if (!found) {
      setInviteStatus('No account with that email.');
      return;
    }
    if (members.some((m) => m.user_id === found.id)) {
      setInviteStatus('That person is already in this group.');
      return;
    }

    const { error: inviteError } = await supabase.from('group_invites').insert({
      group_id: selected.id,
      group_name: selected.name,
      invited_user_id: found.id,
      invited_by: session.user.id,
      invited_by_name: profile?.display_name ?? null,
    });
    if (inviteError) {
      setInviteStatus(
        inviteError.message.includes('duplicate')
          ? 'That person already has a pending invite.'
          : inviteError.message
      );
      return;
    }

    setInviteEmail('');
    setInviteStatus(`Invite sent to ${found.display_name ?? email}.`);
  };

  const recordSettlement = async (transfer: Transfer) => {
    if (!selected) {
      return;
    }
    const { error: settleError } = await supabase.from('group_settlements').insert({
      group_id: selected.id,
      from_user: transfer.from,
      to_user: transfer.to,
      amount: transfer.cents / 100,
    });
    if (settleError) {
      setInviteStatus(settleError.message);
      return;
    }
    fetchBalanceData(selected.id);
  };

  const myCents = session ? net[session.user.id] ?? 0 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Groups</Text>

      {invites.length > 0 && (
        <View style={styles.createCard}>
          <Text style={styles.cardTitle}>Invites</Text>
          {invites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <View style={styles.groupMain}>
                <Text style={styles.groupName}>{invite.group_name}</Text>
                <Text style={styles.mutedText}>
                  From {invite.invited_by_name ?? 'a group member'}
                </Text>
              </View>
              <Pressable style={styles.smallAccept} onPress={() => acceptInvite(invite)}>
                <Text style={styles.primaryButtonText}>Accept</Text>
              </Pressable>
              <Pressable style={styles.smallDecline} onPress={() => declineInvite(invite)}>
                <Text style={styles.cancelText}>Decline</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.createCard}>
        <Text style={styles.cardTitle}>Create a group</Text>
        <TextInput
          style={styles.input}
          placeholder="Group name"
          placeholderTextColor={Colors.textPlaceholder}
          value={newName}
          onChangeText={setNewName}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Pressable style={styles.primaryButton} onPress={handleCreateGroup}>
          <Text style={styles.primaryButtonText}>Create Group</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {groups.length === 0 ? (
          <Text style={styles.mutedText}>No groups yet. Create one above to start sharing expenses.</Text>
        ) : (
          groups.map((group) => (
            <Pressable key={group.id} style={styles.groupRow} onPress={() => openGroup(group)}>
              <Ionicons name="people-outline" size={22} color={Colors.accent} />
              <View style={styles.groupMain}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.mutedText}>{group.role === 'owner' ? 'Owner' : 'Member'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal
        visible={selected !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selected?.name}</Text>
              <Pressable onPress={() => setSelected(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
              <Text style={styles.cardTitle}>Balances</Text>
              <Text style={styles.balanceLine}>
                {myCents > 0
                  ? `You are owed $${(myCents / 100).toFixed(2)}`
                  : myCents < 0
                    ? `You owe $${(-myCents / 100).toFixed(2)}`
                    : 'You are all settled up'}
              </Text>

              {transfers.length === 0 ? (
                <Text style={styles.mutedText}>Nothing to settle yet.</Text>
              ) : (
                transfers.map((transfer) => {
                  const involvesMe =
                    transfer.from === session?.user.id || transfer.to === session?.user.id;
                  return (
                    <View key={`${transfer.from}-${transfer.to}`} style={styles.transferRow}>
                      <Text style={styles.memberName}>
                        {nameOf(transfer.from)} owes {nameOf(transfer.to)} ${(transfer.cents / 100).toFixed(2)}
                      </Text>
                      {involvesMe && (
                        <Pressable style={styles.smallAccept} onPress={() => recordSettlement(transfer)}>
                          <Text style={styles.primaryButtonText}>Mark paid</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })
              )}

              <Text style={styles.cardTitle}>Members</Text>
              {members.map((member) => (
                <View key={member.user_id} style={styles.memberRow}>
                  <Ionicons name="person-circle-outline" size={20} color={Colors.textMuted} />
                  <Text style={styles.memberName}>{member.display_name ?? 'Unnamed'}</Text>
                  {member.role === 'owner' && <Text style={styles.ownerTag}>Owner</Text>}
                </View>
              ))}

              <Text style={styles.cardTitle}>Invite by email</Text>
              <TextInput
                style={styles.input}
                placeholder="friend@example.com"
                placeholderTextColor={Colors.textPlaceholder}
                autoCapitalize="none"
                keyboardType="email-address"
                value={inviteEmail}
                onChangeText={setInviteEmail}
              />
              {inviteStatus && <Text style={styles.infoText}>{inviteStatus}</Text>}
              <Pressable style={styles.primaryButton} onPress={handleInvite}>
                <Text style={styles.primaryButtonText}>Send invite</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  createCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'system-ui',
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  smallAccept: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallDecline: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.textMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  infoText: {
    color: Colors.info,
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  mutedText: {
    color: Colors.textMuted,
    fontFamily: 'system-ui',
    fontSize: 13,
  },
  list: {
    gap: 10,
    paddingBottom: 40,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  groupMain: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    color: Colors.text,
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
  sheetBody: {
    gap: 12,
    paddingBottom: 12,
  },
  balanceLine: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  memberName: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'system-ui',
    fontSize: 15,
  },
  ownerTag: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: 'system-ui',
  },
});
