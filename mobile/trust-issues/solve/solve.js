Java.perform(function() {
    console.log("[*] Trust Issues - BreizhCTF 2026");
    var PinManager = Java.use("com.breizhctf.trustissues.api.PinManager");
    PinManager.isVerified.implementation = function() {
        console.log("[+] PinManager.isVerified() → true");
        return true;
    };
    console.log("[*] Hook installed, login and tap GET FLAG");
});
