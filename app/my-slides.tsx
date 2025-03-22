import { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text, Card, IconButton, FAB, Menu, Portal, Dialog, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createMaterialTopTabNavigator();

interface Slide {
  id: string;
  name: string;
  isFavorite?: boolean;
}

const SingleSlidesScreen = () => {
  const [slides] = useState<Slide[]>([
    { id: '1', name: 'Slide 1' },
    { id: '2', name: 'Slide 2' },
  ]);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);

  const handleMenuPress = (slideId: string) => {
    setMenuVisible(slideId);
  };

  const handleMenuDismiss = () => {
    setMenuVisible(null);
  };

  const handleDelete = () => {
    setDeleteDialogVisible(false);
    // Handle delete logic here
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {slides.map((slide) => (
          <Card key={slide.id} style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.slideName}>
                {slide.name}
              </Text>
              <View style={styles.cardActions}>
                <IconButton
                  icon="play"
                  onPress={() => router.push('/presentation')}
                  iconColor="#4CAF50"
                />
                <Menu
                  visible={menuVisible === slide.id}
                  onDismiss={handleMenuDismiss}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      onPress={() => handleMenuPress(slide.id)}
                    />
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      handleMenuDismiss();
                      router.push('/edit');
                    }}
                    title="Edit"
                    leadingIcon="pencil"
                  />
                  <Menu.Item
                    onPress={() => {
                      handleMenuDismiss();
                      setSelectedSlide(slide);
                      setDeleteDialogVisible(true);
                    }}
                    title="Delete"
                    leadingIcon="delete"
                  />
                  <Menu.Item
                    onPress={() => {
                      handleMenuDismiss();
                      // Handle add to group
                    }}
                    title="Add to Group"
                    leadingIcon="folder-plus"
                  />
                </Menu>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/upload')}
      />
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Slide</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this slide?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const GroupedSlidesScreen = () => {
  const [groups] = useState<Slide[]>([
    { id: '1', name: 'Group 1', isFavorite: true },
    { id: '2', name: 'Group 2', isFavorite: false },
  ]);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Slide | null>(null);

  const handleMenuPress = (groupId: string) => {
    setMenuVisible(groupId);
  };

  const handleMenuDismiss = () => {
    setMenuVisible(null);
  };

  const handleDelete = () => {
    setDeleteDialogVisible(false);
    // Handle delete logic here
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {groups.map((group) => (
          <Card key={group.id} style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <IconButton
                icon={group.isFavorite ? 'star' : 'star-outline'}
                iconColor={group.isFavorite ? '#FFD700' : '#666'}
                onPress={() => {}}
              />
              <Text variant="titleMedium" style={styles.slideName}>
                {group.name}
              </Text>
              <View style={styles.cardActions}>
                <IconButton
                  icon="play"
                  onPress={() => router.push('/presentation')}
                  iconColor="#4CAF50"
                />
                <Menu
                  visible={menuVisible === group.id}
                  onDismiss={handleMenuDismiss}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      onPress={() => handleMenuPress(group.id)}
                    />
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      handleMenuDismiss();
                      // Handle edit
                    }}
                    title="Edit"
                    leadingIcon="pencil"
                  />
                  <Menu.Item
                    onPress={() => {
                      handleMenuDismiss();
                      setSelectedGroup(group);
                      setDeleteDialogVisible(true);
                    }}
                    title="Delete"
                    leadingIcon="delete"
                  />
                </Menu>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Group</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this group?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const FavoritesScreen = () => {
  const [favorites] = useState<Slide[]>([
    { id: '1', name: 'Group 1', isFavorite: true },
    { id: '2', name: 'Group 2', isFavorite: true },
  ]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {favorites.map((favorite) => (
          <Card key={favorite.id} style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <IconButton
                icon="star"
                iconColor="#FFD700"
                onPress={() => {}}
              />
              <Text variant="titleMedium" style={styles.slideName}>
                {favorite.name}
              </Text>
              <View style={styles.cardActions}>
                <IconButton
                  icon="play"
                  onPress={() => router.push('/presentation')}
                  iconColor="#4CAF50"
                />
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

export default function MySlidesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarIndicatorStyle: { backgroundColor: '#4CAF50' },
          tabBarLabelStyle: { textTransform: 'none' },
        }}
      >
        <Tab.Screen
          name="Single"
          component={SingleSlidesScreen}
          options={{ title: 'Single' }}
        />
        <Tab.Screen
          name="Grouped"
          component={GroupedSlidesScreen}
          options={{ title: 'Grouped' }}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ title: 'Favorites' }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideName: {
    flex: 1,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
}); 