import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/theme";


export default function ActivityScreen() {
  return (
    <View style={styles.container}>
      <Text style ={styles.text}>Activity Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: Colors.text,
  },
});
