import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";


export default function DiscoverScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) =>{
      const data: any[] = [];
      snap.forEach((doc) => {
        data.push({id: doc.id, ...doc.data() });
      });

      setPosts(data);
      setLoading(false);
    });

    return () => unsub();
  },[]);

  if(loading){
    return(
      <View style={styles.center}>
        <ActivityIndicator size="large"/>
      </View>
    );
  }

  //simple "search by caption"->improve the algorithm later
  const filteredPosts = posts.filter((post) =>
    (post.caption || "").toLowerCase().includes(search.toLowerCase())
  );

  return(
    <SafeAreaView style={{ flex: 1}}>

      {/* Fixed Search Bar */}
      <View style={[styles.searchWrapper,{ paddingTop: insets.top }]}>
        <TextInput
          placeholder="Search..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView 
        contentContainerStyle={{
          paddingBottom: 30,
          paddingTop: insets.top + 5, // << move content under search bar
        }}
      >
        {/* Post grid */}
        <View style={styles.grid}>
          {filteredPosts.map((post, index) => {
            const isStaggered = index >= 2 && index % 2 === 1;
            return(
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                onPress={()=>
                  router.push({pathname: "/post", params: { id: post.id } })
                }
              >
                {/* UserHeader */}
                <View style={styles.userHeader}>
                  <Image
                    source={
                      post.userPhotoURL?{uri:post.userPhotoURL}:{uri: "https://via.placeholder.com/50"}
                    }
                    style={styles.avatar}
                  />
                  <Text style={styles.usernameText}>
                    {post.username || "Anonymous"}
                  </Text>
                </View>

                {/* Image */}
                {post.imageUrls?.[0]?(
                  <Image
                    source={{ uri: post.imageUrls[0]}}
                    style={styles.image}
                  />
                ):(
                  <View style={[styles.image, styles.placeholder]}>
                    <Text>No Image</Text>
                  </View>
                )}

                {/* Caption Preview */}
                <Text style={styles.caption} numberOfLines={2}>
                  {post.caption || ""}
                </Text>

                {/* Username */}
                <Text style={styles.user}>
                  @{post.uid?.slice(0,6) || "user"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  grid: {
    padding: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card:{
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  image:{
    width: "100%",
    height: 140,
  },
  placeholder:{
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  caption:{
    padding: 10,
    fontSize: 14,
    color: "#444",
  },
  user:{
    paddingHorizontal: 10,
    paddingBottom: 10,
    color: "#888",
    fontSize: 12,
  },
  center:{
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userHeader:{
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  avatar:{
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ddd",
  },
  usernameText:{
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  }
});