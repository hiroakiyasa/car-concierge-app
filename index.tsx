import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { View, Text } from 'react-native';

import App from './App';
import React from 'react';

// Simple error boundary to surface runtime errors instead of a white screen
class RootBoundary extends React.Component<any, { hasError: boolean; err?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, err: undefined };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, err };
  }
  componentDidCatch(err: any, info: any) {
    console.log('[RootBoundary] Caught error', err, info);
  }
  render() {
    if (this.state.hasError) {
      // Minimal inline error UI to avoid blank screen in production
      // eslint-disable-next-line react-native/no-inline-styles
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Text style={{ color: 'red', textAlign: 'center' }}>
            {`App crashed: ${String(this.state.err)}`}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function Root() {
  return (
    <RootBoundary>
      <App />
    </RootBoundary>
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
