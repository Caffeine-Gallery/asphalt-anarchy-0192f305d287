import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Text "mo:base/Text";

actor {
  // Stable storage for high scores
  private stable var highScores : [(Text, Nat)] = [];
  private let MAX_SCORES = 10;

  // Add a new score and maintain top 10
  public shared func addScore(name : Text, score : Nat) : async [(Text, Nat)] {
    let scoresBuffer = Buffer.Buffer<(Text, Nat)>(MAX_SCORES);
    
    // Add existing scores to buffer
    for (score in highScores.vals()) {
      scoresBuffer.add(score);
    };
    
    // Add new score
    scoresBuffer.add((name, score));
    
    // Sort by score (descending)
    let sortedScores = Buffer.toArray(scoresBuffer);
    let sorted = Array.sort<(Text, Nat)>(sortedScores, func(a, b) {
      if (a.1 > b.1) { #less }
      else if (a.1 < b.1) { #greater }
      else { #equal }
    });
    
    // Keep only top scores
    highScores := Array.subArray(sorted, 0, Nat.min(MAX_SCORES, sorted.size()));
    return highScores;
  };

  // Get current high scores
  public query func getHighScores() : async [(Text, Nat)] {
    return highScores;
  };
};
