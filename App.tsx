import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { initDB } from './src/db/database';
import { ModelDownloader } from './src/components/ModelDownloader';
import { AppNavigator } from './src/navigation/AppNavigator';
// Add at the very top of index.js before anything else
initDB();

export default function App() {
  const [ready, setReady] = useState(false);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
      {ready
        ? <AppNavigator />
        : <ModelDownloader onReady={() => setReady(true)} />
      }
    </>
  );
}