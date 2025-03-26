import React from 'react';
import { StyleSheet, View, Modal, TouchableWithoutFeedback } from 'react-native';
import { Avatar, IconButton, Text, Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';

export default function UserHeader() {
  const { session } = useAuth();
  const [dialogVisible, setDialogVisible] = React.useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!session?.user) return null;

  const userEmail = session.user.email;
  const userInitial = userEmail ? userEmail[0].toUpperCase() : '?';

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <Text variant="bodyMedium" style={styles.email}>
          {userEmail}
        </Text>
        <IconButton
          icon={() => (
            <Avatar.Text size={32} label={userInitial} style={styles.avatar} />
          )}
          onPress={() => setDialogVisible(true)}
        />
      </View>
      {/* Logout Confirmation Dialog */}
      <Modal
        transparent
        visible={dialogVisible}
        animationType="fade"
        onRequestClose={() => setDialogVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDialogVisible(false)}>
          <View style={styles.modalBackground}>
            <View style={styles.dialogContainer}>
              <Text variant="titleMedium" style={styles.dialogText}>
                Are you sure you want to logout?
              </Text>
              <View style={styles.buttonContainer}>
                <Button mode="contained" onPress={handleLogout}>
                  Logout
                </Button>
                <Button mode="outlined" onPress={() => setDialogVisible(false)}>
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  email: {
    marginRight: 8,
    color: '#666',
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  dialogText: {
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
});
