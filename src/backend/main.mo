import AccessControl "authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Auth "auth";



actor {
  // Initialize the access control state
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside assignRole
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // User Profile Type
  public type UserProfile = {
    username : Text;
    code : Text;
    jetonBalance : Nat;
    xp : Int;
    title : Text;
    registeredAt : Int;
  };

  // Game State Type
  public type GameState = {
    sessionId : Text;
    player1 : Principal;
    player2 : ?Principal;
    jetonPot : Nat;
    difficulty : Text;
    status : Text;
    createdAt : Int;
  };

  // Transaction Type
  public type Transaction = {
    fromUser : Principal;
    toUser : ?Principal;
    amount : Int;
    transactionType : Text;
    timestamp : Int;
  };

  // Leaderboard Entry Type
  public type LeaderboardEntry = {
    user : Principal;
    username : Text;
    xp : Int;
    title : Text;
    jetonBalance : Nat;
  };

  // Storage
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userCodeMap = Map.empty<Text, Principal>();
  let gameStates = Map.empty<Text, GameState>();
  let transactions = Map.empty<Principal, [Transaction]>();
  let leaderboard = Map.empty<Principal, LeaderboardEntry>();

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile or admin access required");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);

    // Update code mapping
    userCodeMap.add(profile.code, caller);

    // Update leaderboard
    let entry : LeaderboardEntry = {
      user = caller;
      username = profile.username;
      xp = profile.xp;
      title = profile.title;
      jetonBalance = profile.jetonBalance;
    };
    leaderboard.add(caller, entry);
  };

  // User Registration (Public for sync)
  public shared ({ caller }) func registerUser(username : Text) : async Text {
    // Check if username already exists
    for ((principal, profile) in userProfiles.entries()) {
      if (profile.username == username) {
        Runtime.trap("Username already exists");
      };
    };

    // Generate unique code
    let code = await Auth.generateUniqueCode();

    // Check if code already exists (very unlikely but safe)
    switch (userCodeMap.get(code)) {
      case (?_) { Runtime.trap("Code collision, please try again") };
      case null {
        let profile : UserProfile = {
          username = username;
          code = code;
          jetonBalance = 1000;
          xp = 0;
          title = "Başlangıç";
          registeredAt = Time.now();
        };

        userProfiles.add(caller, profile);
        userCodeMap.add(code, caller);

        let entry : LeaderboardEntry = {
          user = caller;
          username = username;
          xp = 0;
          title = "Başlangıç";
          jetonBalance = 1000;
        };
        leaderboard.add(caller, entry);

        code;
      };
    };
  };

  // User Login Validation (Public for sync)
  public query func validateLoginCode(code : Text) : async ?Principal {
    userCodeMap.get(code);
  };

  // Jeton Operations (User-only)
  public shared ({ caller }) func updateJetonBalance(amount : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update jeton balance");
    };

    switch (userProfiles.get(caller)) {
      case (?profile) {
        let newBalance = if (amount < 0) {
          let absAmount = Int.abs(amount);
          if (profile.jetonBalance < absAmount) {
            0;
          } else {
            profile.jetonBalance - absAmount;
          };
        } else {
          profile.jetonBalance + Int.abs(amount);
        };

        let updatedProfile = {
          username = profile.username;
          code = profile.code;
          jetonBalance = newBalance;
          xp = profile.xp;
          title = profile.title;
          registeredAt = profile.registeredAt;
        };

        userProfiles.add(caller, updatedProfile);

        // Update leaderboard
        switch (leaderboard.get(caller)) {
          case (?entry) {
            let updatedEntry = {
              user = entry.user;
              username = entry.username;
              xp = entry.xp;
              title = entry.title;
              jetonBalance = newBalance;
            };
            leaderboard.add(caller, updatedEntry);
          };
          case null {};
        };

        // Record transaction
        let transaction : Transaction = {
          fromUser = caller;
          toUser = null;
          amount = amount;
          transactionType = "balance_update";
          timestamp = Time.now();
        };

        switch (transactions.get(caller)) {
          case (?txList) {
            transactions.add(caller, [transaction].concat(txList));
          };
          case null {
            transactions.add(caller, [transaction]);
          };
        };
      };
      case null {
        Runtime.trap("User profile not found");
      };
    };
  };

  // XP Operations (User-only)
  public shared ({ caller }) func updateXP(xpChange : Int) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update XP");
    };

    switch (userProfiles.get(caller)) {
      case (?profile) {
        let newXP = profile.xp + xpChange;

        // Calculate new title
        let newTitle = if (newXP < 50) {
          "Başlangıç";
        } else if (newXP < 200) {
          "Amatör";
        } else if (newXP < 500) {
          "Orta";
        } else if (newXP < 1000) {
          "İleri";
        } else if (newXP < 2000) {
          "Uzman";
        } else if (newXP < 4000) {
          "Usta";
        } else {
          "Büyükusta";
        };

        let updatedProfile = {
          username = profile.username;
          code = profile.code;
          jetonBalance = profile.jetonBalance;
          xp = newXP;
          title = newTitle;
          registeredAt = profile.registeredAt;
        };

        userProfiles.add(caller, updatedProfile);

        // Update leaderboard
        let updatedEntry : LeaderboardEntry = {
          user = caller;
          username = profile.username;
          xp = newXP;
          title = newTitle;
          jetonBalance = profile.jetonBalance;
        };
        leaderboard.add(caller, updatedEntry);

        newTitle;
      };
      case null {
        Runtime.trap("User profile not found");
      };
    };
  };

  // Leaderboard (Public read)
  public query func getLeaderboard() : async [LeaderboardEntry] {
    let entries = Array.fromIter(leaderboard.values());
    entries.sort(
      func(a, b) {
        if (a.xp > b.xp) { return #less };
        if (a.xp < b.xp) { return #greater };
        #equal;
      }
    );
  };

  // Game State Management (User-only)
  public shared ({ caller }) func createGameSession(sessionId : Text, jetonWager : Nat, difficulty : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create game sessions");
    };

    let gameState : GameState = {
      sessionId = sessionId;
      player1 = caller;
      player2 = null;
      jetonPot = jetonWager;
      difficulty = difficulty;
      status = "waiting";
      createdAt = Time.now();
    };

    gameStates.add(sessionId, gameState);
  };

  public shared ({ caller }) func joinGameSession(sessionId : Text, jetonWager : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join game sessions");
    };

    switch (gameStates.get(sessionId)) {
      case (?game) {
        if (game.player1 == caller) {
          Runtime.trap("Cannot join your own game");
        };

        let updatedGame = {
          sessionId = game.sessionId;
          player1 = game.player1;
          player2 = ?caller;
          jetonPot = game.jetonPot + jetonWager;
          difficulty = game.difficulty;
          status = "active";
          createdAt = game.createdAt;
        };

        gameStates.add(sessionId, updatedGame);
      };
      case null {
        Runtime.trap("Game session not found");
      };
    };
  };

  public query func getGameSession(sessionId : Text) : async ?GameState {
    gameStates.get(sessionId);
  };

  public query func getActiveGameSessions() : async [GameState] {
    Array.fromIter(gameStates.values()).filter(func(game) { game.status == "waiting" });
  };

  // Admin Operations (Admin-only)
  public shared ({ caller }) func sendJetonsToAllUsers(amount : Nat, message : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can send jetons to all users");
    };

    for ((principal, profile) in userProfiles.entries()) {
      let updatedProfile = {
        username = profile.username;
        code = profile.code;
        jetonBalance = profile.jetonBalance + amount;
        xp = profile.xp;
        title = profile.title;
        registeredAt = profile.registeredAt;
      };

      userProfiles.add(principal, updatedProfile);

      // Update leaderboard
      switch (leaderboard.get(principal)) {
        case (?entry) {
          let updatedEntry = {
            user = entry.user;
            username = entry.username;
            xp = entry.xp;
            title = entry.title;
            jetonBalance = profile.jetonBalance + amount;
          };
          leaderboard.add(principal, updatedEntry);
        };
        case null {};
      };
    };
  };

  public shared ({ caller }) func sendJetonsToUser(username : Text, amount : Nat, message : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can send jetons to specific users");
    };

    var found = false;
    for ((principal, profile) in userProfiles.entries()) {
      if (profile.username == username) {
        found := true;
        let updatedProfile = {
          username = profile.username;
          code = profile.code;
          jetonBalance = profile.jetonBalance + amount;
          xp = profile.xp;
          title = profile.title;
          registeredAt = profile.registeredAt;
        };

        userProfiles.add(principal, updatedProfile);

        // Update leaderboard
        switch (leaderboard.get(principal)) {
          case (?entry) {
            let updatedEntry = {
              user = entry.user;
              username = entry.username;
              xp = entry.xp;
              title = entry.title;
              jetonBalance = profile.jetonBalance + amount;
            };
            leaderboard.add(principal, updatedEntry);
          };
          case null {};
        };
      };
    };

    if (not found) {
      Runtime.trap("User not found");
    };
  };

  public query ({ caller }) func getSystemStatistics() : async { totalUsers : Nat; totalJetons : Nat; averageXP : Int } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view system statistics");
    };

    var totalUsers = 0;
    var totalJetons = 0;
    var totalXP = 0;

    for ((_, profile) in userProfiles.entries()) {
      totalUsers += 1;
      totalJetons += profile.jetonBalance;
      totalXP += profile.xp.toNat();
    };

    let averageXP = if (totalUsers > 0) {
      totalXP / totalUsers;
    } else {
      0;
    };

    {
      totalUsers = totalUsers;
      totalJetons = totalJetons;
      averageXP = averageXP;
    };
  };

  public query func getAllUsers() : async [UserProfile] {
    Array.fromIter(userProfiles.values());
  };
};
