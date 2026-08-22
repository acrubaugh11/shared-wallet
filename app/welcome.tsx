import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function WelcomeScreen() {
  const checkScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);

  useEffect(() => {
    checkScale.value = withSequence(
      withTiming(1.15, { duration: 350, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) })
    );
    textOpacity.value = withDelay(250, withTiming(1, { duration: 350 }));
    textTranslateY.value = withDelay(
      250,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) })
    );
  }, [checkScale, textOpacity, textTranslateY]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={checkStyle}>
        <Ionicons name="checkmark-circle" size={96} color={Colors.accent} />
      </Animated.View>
      <Animated.Text style={[styles.text, textStyle]}>Logged in</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 22,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
});
