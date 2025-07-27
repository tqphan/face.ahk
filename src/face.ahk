#Requires AutoHotkey >=2.0
#SingleInstance Force
#Include .\lib\WebView2\webview2.ahk
#InputLevel 1
SendLevel 1

class App {
	static NAME := "face.ahk"
	static HOST := "face.ahk.localhost"
	static URL := "https://face.ahk.localhost/index.html"
	static PROFILE_NAME := "user.profiles.json"
	static PROFILE_PATH := A_ScriptDir "\res\json\"
	static SETTINGS_NAME := "user.settings.json"
	static SETTINGS_PATH := A_ScriptDir "\res\json\"
}

TraySetIcon("favicon.ico")

ui := Gui()
ui.Title := App.NAME
ui.Opt("+Resize +Border +MaximizeBox +MinimizeBox +MinSize640x480")
ui.BackColor := 0x212529
ui.OnEvent("Size", Gui_Size)
ui.Show(Format("w{} h{}", A_ScreenWidth * 0.75, A_ScreenHeight * 0.75))
wv := WebView2.CreateControllerAsync(ui.Hwnd).await2()
wv.CoreWebView2.add_WebMessageReceived(WebView2.Handler(WebMessageReceivedEventHandler))
wv.CoreWebView2.SetVirtualHostNameToFolderMapping(App.HOST, A_ScriptDir, 1)
wv.CoreWebView2.AddHostObjectToScript('SaveProfiles', SaveProfiles)
wv.CoreWebView2.AddHostObjectToScript('SaveSettings', SaveSettings)
wv.CoreWebView2.InjectAhkComponent()
wv.CoreWebView2.Navigate(App.URL)

SetWindowDarkMode(ui.Hwnd, true)

WebMessageReceivedEventHandler(handler, ICoreWebView2, WebMessageReceivedEventArgs) {
	args := WebView2.WebMessageReceivedEventArgs(WebMessageReceivedEventArgs)
	msg := args.TryGetWebMessageAsString()
	if (WinActive("ahk_id" ui.Hwnd)) {
		return
	}
	try Send(msg)
}

SaveProfiles(content) {
	try {
		FileDelete(App.PROFILE_PATH App.PROFILE_NAME)
		FileAppend(content, App.PROFILE_PATH App.PROFILE_NAME)
	} catch Error as e {
		MsgBox e.Message
	}
}

SaveSettings(content) {
	try {
		FileDelete(App.SETTINGS_PATH App.SETTINGS_NAME)
		FileAppend(content, App.SETTINGS_PATH App.SETTINGS_NAME)
	} catch Error as e {
		MsgBox e.Message
	}
}

SetWindowDarkMode(hwnd, enable := true) {
	if VerCompare(A_OSVersion, "10.0.17763") >= 0 {
		attr := 19
		if VerCompare(A_OSVersion, "10.0.18985") >= 0 {
			attr := 20
		}
		DllCall("dwmapi\DwmSetWindowAttribute", "ptr", hwnd, "int", attr, "int*", enable, "int", 4)
	}
}

gui_size(GuiObj, MinMax, Width, Height) {
	if (MinMax != -1) {
		try wv.Fill()
	}
}