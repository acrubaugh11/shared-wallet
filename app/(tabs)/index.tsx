import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PlaceholderImage = require('@/assets/images/logo.png');

export default function Index() {
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
    <View style={[styles.container, {paddingTop: useSafeAreaInsets().top + 10}]}>
    {/* Header/top part for home page */}\
    <View style = {styles.header}>
      <View style={styles.headerContainer}>
        <View style={styles.nameLogo}>
          <Text style={styles.text}>Hello, Alex</Text>
          <Ionicons name="hand-right-sharp" size={24} color="#ffd33d" onPress={() => {}} />
        </View>
        <Ionicons name="notifications-sharp" size={30} color="#ffd33d" onPress={() => {}} />
      </View>
      <Text style={styles.subText}>Track, share, spend together!</Text>
    </View>

    {/*Total spent this month container */}
    <View style={styles.totalSpentContainer}>
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
    </View>

    <View style={styles.boxes}>
      <View style={styles.box}>
        <Ionicons name="wallet-outline" size={24} color="#ffd33d" onPress={() => {}} />
        <Text   minimumFontScale={0.6} numberOfLines={1} adjustsFontSizeToFit style={styles.boxText}>Expenses</Text>
      </View>
      <View style={styles.box}>
        <Ionicons name="people-outline" size={24} color="#ffd33d" onPress={() => {}} />
        <Text minimumFontScale={0.6}  numberOfLines={1} adjustsFontSizeToFit  style={styles.boxText}>Groups</Text>

      </View>
      <View style={styles.box}>
        <Ionicons name="notifications-outline" size={24} color="#ffd33d" onPress={() => {}} />
        <Text minimumFontScale={0.6}  numberOfLines={1} adjustsFontSizeToFit  style={styles.boxText}>Activity</Text>

      </View>
      <View style={styles.box}>
        <Ionicons name="person-outline" size={24} color="#ffd33d" onPress={() => {}} />
        <Text minimumFontScale={0.6}  numberOfLines={1} adjustsFontSizeToFit  style={styles.boxText}>Profile</Text>

      </View>
    </View>







    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a121b',
    gap: 20,
    paddingHorizontal: 20,
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
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  subText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'light',
    fontFamily: 'system-ui',
    width: '100%',
  },
  boxText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'light',
    fontFamily: 'system-ui',
    width: '100%',
  },
  totalSpentContainer: {
    backgroundColor: '#2b0909',
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
    justifyContent: 'space-between',
    gap: 10
  },
  box: {
    backgroundColor: '#2e0202',
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'column',
    padding: 12,
    gap: 10,
    flex: 1
  }
});