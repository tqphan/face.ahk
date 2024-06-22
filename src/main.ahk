#Requires AutoHotkey >=2.0
#SingleInstance Force
#Include .\lib\WebView2\webview2.ahk
#InputLevel 1
SendLevel 1
class App {
	static NAME := "face.ahk"
}

TraySetIcon("favicon.ico")

g := Gui()
g.Title := App.NAME
g.Opt("+Resize -DPIScale +Border +MaximizeBox +MinimizeBox +MinSize640x480")
g.BackColor := 0x212529
g.OnEvent("Size", Gui_Size)
g.Show(Format("w{} h{}", A_ScreenWidth * 0.75, A_ScreenHeight * 0.75))
wv := WebView2.create(g.Hwnd)
wv.CoreWebView2.add_WebMessageReceived(WebView2.Handler(WebMessageReceivedEventHandler))
wv.CoreWebView2.SetVirtualHostNameToFolderMapping("phiz.localhost", A_ScriptDir, 1)
;ww
;wv.CoreWebView2.AddScriptToExecuteOnDocumentCreated('window.chrome.webview.addEventListener("message", event => alert(event.data));window.chrome.webview.postMessage(window.document.URL);', 0)
wv.CoreWebView2.Navigate("https://phiz.localhost/index.html")

WebMessageReceivedEventHandler(handler, ICoreWebView2, WebMessageReceivedEventArgs) {
	args := WebView2.WebMessageReceivedEventArgs(WebMessageReceivedEventArgs)
	msg := args.TryGetWebMessageAsString()
	if(WinActive("ahk_id" g.Hwnd)) {
		return
	}
	try Send(msg)
	;WebView2.Core(ICoreWebView2).PostWebMessageAsString(json)
}


if VerCompare(A_OSVersion, "10.0.17763") >= 0 {
    attr := 19
    if VerCompare(A_OSVersion, "10.0.18985") >= 0 {
        attr := 20
    }
    DllCall("dwmapi\DwmSetWindowAttribute", "ptr", g.Hwnd, "int", attr, "int*", true, "int", 4)
}

gui_size(GuiObj, MinMax, Width, Height) {
	if (MinMax != -1) {
		try wv.Fill()
	}
}