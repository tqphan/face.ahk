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
	static SHORTCUT_LINK := A_Startup "\" A_ScriptName ".lnk"
	static INSTALL_DIRECTORY := RegRead("HKLM\SOFTWARE\AutoHotkey", "InstallDir", "")
	static SHORTCUT_TARGET := (A_PtrSize = 8) ? App.INSTALL_DIRECTORY "\v2\AutoHotkey64_UIA.exe" : App.INSTALL_DIRECTORY "\v2\AutoHotkey32_UIA.exe"
	static SHORTCUT_DESCRIPTION := A_ScriptName
	static SHORTCUT_ICON := A_ScriptDir "\favicon.ico"
	static SHORTCUT_ARGUMENTS := '"' A_ScriptFullPath '"'
}

TraySetIcon("favicon.ico")

ui := Gui()
ui.Title := App.NAME
ui.Opt("+Resize +Border +MaximizeBox +MinimizeBox +MinSize640x480")
ui.BackColor := 0x212529
ui.OnEvent("Size", Sizing)
ui.OnEvent("Close", Closing)
ui.Show(Format("w{} h{}", A_ScreenWidth * 0.75, A_ScreenHeight * 0.75))
wv := WebView2.CreateControllerAsync(ui.Hwnd).await2()
wv.CoreWebView2.add_WebMessageReceived(WebView2.Handler(WebMessageReceivedEventHandler))
wv.CoreWebView2.SetVirtualHostNameToFolderMapping(App.HOST, A_ScriptDir, 1)
wv.CoreWebView2.AddHostObjectToScript('SaveProfiles', SaveProfiles)
wv.CoreWebView2.AddHostObjectToScript('SaveSettings', SaveSettings)
wv.CoreWebView2.AddHostObjectToScript('SimulateInput', SimulateInput)
wv.CoreWebView2.AddHostObjectToScript('SetDarkMode', SetDarkMode)
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

SimulateInput(content, allow) {
	if (WinActive("ahk_id" ui.Hwnd) && !allow)
		return
	try Send(content)
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

SetDarkMode(enabled) {
	SetWindowDarkMode(ui.Hwnd, enabled)
}

CreateShortcut() {
	try {
		if (FileExist(App.SHORTCUT_LINK)) {
			FileDelete(App.SHORTCUT_LINK)
		}
		FileCreateShortcut(App.SHORTCUT_TARGET, App.SHORTCUT_LINK, 
			A_ScriptDir, App.SHORTCUT_ARGUMENTS, 
			App.SHORTCUT_DESCRIPTION, App.SHORTCUT_ICON)

		return FileExist(App.SHORTCUT_LINK) ? true : false
	}
	catch as err {
		MsgBox(err.Message)
		return false
	}
}

RemoveShortcut() {
	try {
		if (FileExist(App.SHORTCUT_LINK)) {
			FileDelete(App.SHORTCUT_LINK)
			return true
		}
		return false
	}
	catch as err {
		MsgBox(err.Message)
		return false
	}
}

ValidateShortcut() {
    try {
        FileGetShortcut(App.SHORTCUT_LINK, &target)
        return (StrLower(target) = StrLower(App.SHORTCUT_TARGET))
    }
    catch {
        return false
    }
}

Sizing(GuiObj, MinMax, Width, Height) {
	if (MinMax != -1) {
		try wv.Fill()
	}
}

Closing(GuiObj) {
	wv.CoreWebView2.ExecuteScriptAsync("window.app.exiting()")
	; if (result)
	; 	ExitApp
	ui.Hide()
	Sleep 1000
	ExitApp
}