// Client-side API wrapper for wrong words functionality

/**
 * Add a word to the user's wrong words list
 * @param userId The user ID
 * @param word The word object to add
 * @returns Promise that resolves when the word is added
 */
export async function addWrongWord(userId: string, word: any) {
  try {
    const response = await fetch("/api/words/wrong", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        word,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to add wrong word");
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding wrong word:", error);
    throw error;
  }
}

/**
 * Mark a word as mastered
 * @param wordId The word ID to mark as mastered
 * @returns Promise that resolves when the word is marked as mastered
 */
export async function markWordAsMastered(wordId: string) {
  try {
    const response = await fetch("/api/words/wrong", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wordId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to mark word as mastered");
    }

    return await response.json();
  } catch (error) {
    console.error("Error marking word as mastered:", error);
    throw error;
  }
}
