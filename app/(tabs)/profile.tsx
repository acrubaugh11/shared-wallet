import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/theme";


export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style ={styles.text}>Profile Screen</Text>
      {session && <Text style={styles.email}>{session.user.email}</Text>}
      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    color: Colors.text,
  },
  email: {
    color: Colors.textMuted,
  },
  signOutButton: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 12,
  },
  signOutText: {
    color: Colors.accent,
    fontWeight: 'bold',
  },
});
