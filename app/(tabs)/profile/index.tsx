import { getUserProfile } from "@/lib/userProfile";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../../firebase";

type UserProfile = {
  username?: string;
  email?: string;
  bio?: string;
  photoURL?: string;
};


export default function ProfileScreen (){
    const user = auth.currentUser;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");


      useEffect(() => {
        const loadProfile = async() => {
          if(!user){
            setLoading(false);
            return;
          }
          try{
            const data = await getUserProfile(user.uid);
            if(data){
              const typed = data as UserProfile;
              setProfile(typed);
              setUsername(typed.username ?? "");
              setBio(typed.bio ?? "");
            }
          }catch(err){
            console.log("Failed to load profile: ", err);
          }finally{
            setLoading(false);
          }
        };
        loadProfile();
      }, [user]);
    

    const photoURL = profile?.photoURL;
    return(
        <SafeAreaView style={styles.container}>

            {/*Profile pic */}
            <View style={styles.avatarContainer}>
                <Image
                source={photoURL?{uri:photoURL}:require("../../../assets/images/default-avatar.png")}
                style={styles.avatar}
                />
            </View>

            {/*Edit Profile*/}
            <TouchableOpacity 
                style={styles.editButton}
                onPress={() => {
                    router.push("/(tabs)/profile/edit"); 
                }}
            >
                <Text style={styles.label}>Edit Profile</Text>
            </TouchableOpacity>

            {/*Username*/}
            <Text style={styles.label}>Username</Text>
            <Text style={styles.text}>{username}</Text>

            {/*Bio*/}
            <Text style={styles.label}>Bio</Text>
            <Text style={styles.text}>{bio}</Text>

            {/*Following + Followers*/}
            <TouchableOpacity>
                <Text style={styles.label}>Following</Text>
            </TouchableOpacity>
          
            <TouchableOpacity>
                <Text style={styles.label}>Followers</Text>
            </TouchableOpacity>

            {/*Posts + Saved Posts*/}
            <TouchableOpacity>
                <Text style={styles.label}>Posts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity>
                <Text style={styles.label}>Saved</Text>
            </TouchableOpacity>

        </SafeAreaView>
    );
}

const styles= StyleSheet.create({
    center:{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    container:{
        flex: 1,
        padding: 24,
        backgroundColor: "#fff",
    },
    avatarContainer:{
        alignItems: "center",
        marginBottom: 24,
    },
    avatar:{
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#eee",
    },
    label:{
        fontSize: 14,
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 4, 
    },
    text:{
        fontSize: 14,
        fontWeight: "300",
        marginTop: 8,
        marginBottom: 4, 
    },
    editButton:{
        alignItems: "center",
        justifyContent: "center",
    }
});
