import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { ChatScreen } from '../screens/ChatScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const icon = (label: string) => ({ color }: { color: string }) =>
  <Text style={{ fontSize: 20, color }}>{label}</Text>;

export const AppNavigator = () => (
  <NavigationContainer>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0a0a0f', borderTopColor: '#1e1e2e', height: 60 },
        tabBarActiveTintColor: '#7c6aff',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 11, marginBottom: 6 },
      }}>
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarIcon: icon('💬') }} />
      <Tab.Screen name="Documents" component={DocumentsScreen} options={{ tabBarIcon: icon('📄') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: icon('⚙️') }} />
    </Tab.Navigator>
  </NavigationContainer>
);