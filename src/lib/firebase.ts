import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Client-side public Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcY31zcOfYn4ByeUWILUhRgaWzqj_vjec",
  authDomain: "gen-lang-client-0696605202.firebaseapp.com",
  projectId: "gen-lang-client-0696605202",
  storageBucket: "gen-lang-client-0696605202.firebasestorage.app",
  messagingSenderId: "933201979968",
  appId: "1:933201979968:web:9a25ce6d775dccb7db8da5"
};

const customDatabaseId = "ai-studio-catvocabularylea-1af690a1-f6c3-49f6-b79f-7a0694c3b6cf";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore targeting our specific database instance ID
export const db = getFirestore(app, customDatabaseId);

// Validate Connection to Firestore on boot as per guidelines
async function testConnection() {
  try {
    // Attempt to read a mock connection doc to verify credentials and endpoint routing
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test completed.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.", error);
    } else {
      console.log("Firestore connection tested (may be uninitialized collection, which is expected):", error.message);
    }
  }
}

testConnection();
