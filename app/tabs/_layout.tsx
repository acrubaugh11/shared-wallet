import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';



export default function TabLayout() {
  return (
    <Tabs
    screenOptions={{
        tabBarActiveTintColor: '#ffd33d',
        headerStyle: {
            backgroundColor: '#25292e',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        tabBarStyle: {
            backgroundColor: '#070707',
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
        }
    }}
    >
      <Tabs.Screen name="index"
       options={{
         title: 'Home',
         tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24}/>
        ),

         }} />
      <Tabs.Screen name="groups" 
      options={{
         title: 'Groups' ,
         tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'people-circle' : 'people-circle-outline'} color={color} size={24}/>
         ), 
        }} />
              <Tabs.Screen name="activity" 
      options={{
         title: 'Activity' ,
         tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'notifications-circle' : 'notifications-circle-outline'} color={color} size={24}/>
         ), 
        }} />
              <Tabs.Screen name="profile" 
      options={{
         title: 'Profile' ,
         tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={color} size={24}/>
         ), 
        }} />
    </Tabs>
  );
}
