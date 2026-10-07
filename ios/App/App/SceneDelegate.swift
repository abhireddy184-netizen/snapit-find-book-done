import UIKit
import Capacitor
import WebKit

/// Loads https://getpros.ai and keeps Apple sign-in plus in-app media capture working.
class GetProsBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        let script = WKUserScript(
            source: GetProsWebShell.source,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        webView?.configuration.userContentController.addUserScript(script)
    }
}

enum GetProsWebShell {
    /// Runs in the WebView only. The published site is unchanged.
    ///
    /// Voice on getpros.ai prefers MediaRecorder. Web Speech API (`webkitSpeechRecognition`)
    /// does not work reliably in WKWebView and can crash if it starts without a speech
    /// entitlement, so it is removed and the site falls through to the recorder path.
    ///
    /// Google blocks OAuth inside WKWebView. The "Continue with Google" button is hidden
    /// so the tap does not land on Google's disallowed-useragent page. Email and Apple stay.
    static let source = """
    (function () {
      try {
        Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: undefined });
        Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: undefined });
      } catch (e) {}
      function hideGoogle() {
        var buttons = document.querySelectorAll("button");
        for (var i = 0; i < buttons.length; i++) {
          var text = (buttons[i].textContent || "").replace(/\\s+/g, " ").trim();
          if (text === "Continue with Google") {
            buttons[i].style.display = "none";
            buttons[i].setAttribute("hidden", "");
          }
        }
      }
      function watch() {
        hideGoogle();
        if (!document.documentElement) return;
        new MutationObserver(hideGoogle).observe(document.documentElement, { childList: true, subtree: true });
      }
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
      else watch();
    })();
    """
}

extension WebViewDelegationHandler {
    private static var didInstallInAppWindows = false
    private static var originalCreateWebView: IMP?
    private static let createWebViewSelector = #selector(WebViewDelegationHandler.webView(_:createWebViewWith:for:windowFeatures:))

    private typealias CreateWebViewIMP = @convention(c) (
        AnyObject,
        Selector,
        WKWebView,
        WKWebViewConfiguration,
        WKNavigationAction,
        WKWindowFeatures
    ) -> WKWebView?

    /// Capacitor opens every `window.open` / `target=_blank` in Safari. Apple's
    /// web sign-in sometimes does that. Allowed hosts load in this WebView instead,
    /// so the return to https://getpros.ai/~oauth/callback stays in the app.
    static func installInAppWindows() {
        if didInstallInAppWindows { return }
        let replacement = #selector(WebViewDelegationHandler.getpros_createWebView(_:configuration:action:features:))
        guard
            let originalMethod = class_getInstanceMethod(WebViewDelegationHandler.self, createWebViewSelector),
            let replacementMethod = class_getInstanceMethod(WebViewDelegationHandler.self, replacement)
        else {
            return
        }
        originalCreateWebView = method_getImplementation(originalMethod)
        method_exchangeImplementations(originalMethod, replacementMethod)
        didInstallInAppWindows = true
    }

    @objc func getpros_createWebView(
        _ webView: WKWebView,
        configuration: WKWebViewConfiguration,
        action navigationAction: WKNavigationAction,
        features windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url, Self.staysInApp(url) {
            webView.load(URLRequest(url: url))
            return nil
        }
        guard let imp = Self.originalCreateWebView else { return nil }
        let original = unsafeBitCast(imp, to: CreateWebViewIMP.self)
        return original(self, Self.createWebViewSelector, webView, configuration, navigationAction, windowFeatures)
    }

    private static func staysInApp(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        if host == "getpros.ai" || host.hasSuffix(".getpros.ai") { return true }
        if host == "appleid.apple.com" || host.hasSuffix(".apple.com") || host.hasSuffix(".cdn-apple.com") { return true }
        if host == "oauth.lovable.app" || host == "lovable.dev" || host.hasSuffix(".lovable.dev") { return true }
        if host == "osvtvbzhihemzwlubcut.supabase.co" { return true }
        return false
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        WebViewDelegationHandler.installInAppWindows()
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = GetProsBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
