import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PlaceholderImage = require('@/assets/images/logo.png');
const BackgroundImage = require('@/assets/images/bg.jpg');

export default function Index() {
  const { profile } = useAuth();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    } else {
      alert('You did not select any image.');
    }
  };

  return (
    <ImageBackground
      source={BackgroundImage}
      resizeMode="cover"
      style={[styles.container, {paddingTop: useSafeAreaInsets().top + 10}]}
    >
    <View style={styles.overlay} />
    {/* Header/top part for home page */}
    <View style = {styles.header}>
      <View style={styles.headerContainer}>
        <View style={styles.nameLogo}>
          <Text style={styles.text}>Hello, {profile?.display_name ?? 'there'}</Text>
          <Ionicons name="hand-right-sharp" size={24} color={Colors.accent} onPress={() => {}} />
        </View>
        <Ionicons name="notifications-sharp" size={30} color={Colors.accent} onPress={() => {}} />
      </View>
      <Text style={styles.subText}>Track, share, spend together!</Text>
    </View>

    {/*Total spent this month container */}
    {/* <View style={styles.totalSpentContainer}>
      <View style={styles.totalSpentText}>
        <Text style={styles.subText}>This Month</Text>
        <Text style={styles.subText}>Toal Spent:</Text>
        <Text style={styles.text}>$1,245</Text>
      </View>
      <View style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/pie.png')}
          style={styles.pieImage}
        />
      </View>
    </View> */}

    <View style={styles.boxes}>
      <Pressable style={styles.box} onPress={() => router.push('/expenses')}>
        <Ionicons name="wallet-outline" size={24} color={Colors.accent} />
        <Text   minimumFontScale={0.6} numberOfLines={1} adjustsFontSizeToFit style={styles.boxText}>Expenses</Text>
      </Pressable>
      <Pressable style={styles.box} onPress={() => router.push('/groups')}>
        <Ionicons name="people-outline" size={24} color={Colors.accent} />
        <Text minimumFontScale={0.6}  numberOfLines={1} adjustsFontSizeToFit  style={styles.boxText}>Groups</Text>

      </Pressable>
      <Pressable style={styles.box} onPress={() => router.push('/activity')}>
        <Ionicons name="notifications-outline" size={24} color={Colors.accent} />
        <Text minimumFontScale={0.6}  numberOfLines={1} adjustsFontSizeToFit  style={styles.boxText}>Activity</Text>

      </Pressable>
      <Pressable style={styles.box} onPress={() => router.push('/profile')}>
        <Ionicons name="person-outline" size={24} color={Colors.accent} />
        <Text minimumFontScale={0.6}  numberOfLines={1} adjustsFontSizeToFit  style={styles.boxText}>Profile</Text>

      </Pressable>
    </View>







    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    gap: 20,
    paddingHorizontal: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23, 10, 10, 0.6)',
  },
  header: {
    // backgroundColor: 'green',
    flexDirection: 'column',
    width: '100%',
    paddingTop: 20,
    paddingBottom: 10,
    gap: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // backgroundColor: 'red'
  },
  nameLogo: {
    flexDirection: 'row',
    gap: 20,
    // backgroundColor: 'blue',
  },
  imageContainer: {
    width: 150,
    height: 150,
  },
  pieImage: {
    width: '100%',
    height: '100%',
  },
  footerContainer: {
    alignItems: 'center',
  },
  text: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  subText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: 'light',
    fontFamily: 'system-ui',
    width: '100%',
  },
  boxText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: 'light',
    fontFamily: 'system-ui',
    width: '100%',
  },
  totalSpentContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between'

  },
  totalSpentText:{
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignSelf: 'stretch'
  },
  boxes:{
    flexDirection: 'row',
    gap: 10
  },
  box: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'column',
    padding: 12,
    gap: 10,
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    borderColor: '#191210'
  }
});