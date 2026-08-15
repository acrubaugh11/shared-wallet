import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, Text, View } from 'react-native';

import { useState } from 'react';


import Button from '@/components/Button';

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
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        <View style={[styles.box, { backgroundColor: '#ff6b6b' }]}>
          <Text style={styles.text}>1</Text>
        </View>
        <View style={[styles.box, { backgroundColor: '#4dadf7' }]}>
          <Text style={styles.text}>2</Text>
        </View>
        <View style={[styles.box, { backgroundColor: '#51cf66' }]}>
          <Text style={styles.text}>3</Text>
        </View>
        <View style={[styles.box, { backgroundColor: '#fcc419' }]}>
          <Text style={styles.text}>4</Text>
        </View>
      </View>
      <View style={styles.footerContainer}>
        <Button theme="primary" label="Add New Expense" onPress={() => alert('You pressed a button.')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a121b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
  },
  footerContainer: {
    alignItems: 'center',
  },
    gridContainer: {
    width: 300,
    height: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  box: {
    width: '50%',
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});