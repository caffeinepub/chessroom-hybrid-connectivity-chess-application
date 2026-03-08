import Text "mo:core/Text";
import Array "mo:core/Array";
import Random "mo:core/Random";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";

/// Auth module - Protected from modification
module {
  public func generateUniqueCode() : async Text {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let charArray = chars.toArray();
    var code = "";

    let random = Random.crypto();

    var i = 0;
    while (i < 8) {
      if (i == 4) {
        code #= " ";
      };
      let randomNat8 = await* { random.nat8() };
      let index = randomNat8.toNat() % 36;
      code #= charArray[index].toText();
      i += 1;
    };
    code;
  };
};
