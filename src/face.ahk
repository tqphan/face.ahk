#Requires AutoHotkey >=2.0
#SingleInstance Force
#Include .\lib\WebView2\webview2.ahk
#InputLevel 1
SendLevel 1

class App {
	static NAME := "face.ahk"
	static HOST := "face.ahk.localhost"
	static URL := "https://face.ahk.localhost/index.html"
	static PROFILE_NAME := "user.profile.json"
	static PROFILE_PATH := A_ScriptDir "\res\json\"
}

TraySetIcon("favicon.ico")

g := Gui()
g.Title := App.NAME
g.Opt("+Resize +Border +MaximizeBox +MinimizeBox +MinSize640x480")
g.BackColor := 0x212529
g.OnEvent("Size", Gui_Size)
g.Show(Format("w{} h{}", A_ScreenWidth * 0.75, A_ScreenHeight * 0.75))
wv := WebView2.CreateControllerAsync(g.Hwnd).await2()
wv.CoreWebView2.add_WebMessageReceived(WebView2.Handler(WebMessageReceivedEventHandler))
wv.CoreWebView2.SetVirtualHostNameToFolderMapping(App.HOST, A_ScriptDir, 1)
wv.CoreWebView2.AddHostObjectToScript('SaveProfile', SaveProfile)
wv.CoreWebView2.InjectAhkComponent()
wv.CoreWebView2.Navigate(App.URL)

WebMessageReceivedEventHandler(handler, ICoreWebView2, WebMessageReceivedEventArgs) {
	args := WebView2.WebMessageReceivedEventArgs(WebMessageReceivedEventArgs)
	msg := args.TryGetWebMessageAsString()
	if (WinActive("ahk_id" g.Hwnd)) {
		return
	}
	try Send(msg)
}

SaveProfile(content) {
	FileDelete(App.PROFILE_PATH App.PROFILE_NAME)
	FileAppend(content, App.PROFILE_PATH App.PROFILE_NAME)
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