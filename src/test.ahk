#Requires AutoHotkey >=2.0
#SingleInstance Force
#Include .\lib\WebView2\webview2.ahk

main := Gui()
main.Show(Format('w{} h{}', A_ScreenWidth * 0.3, A_ScreenHeight * 0.3))
wvc := WebView2.CreateControllerAsync(main.Hwnd).await()
wv := wvc.CoreWebView2
wv.AddHostObjectToScript('CreateGUI', CreateGUI)
wv.InjectAhkComponent()
wv.OpenDevToolsWindow()
wv.NavigateToString('main window')
CreateGUI(obj_options) {
	OutputDebug(obj_options)
}