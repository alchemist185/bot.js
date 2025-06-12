
local Players = game:GetService("Players")
local CoreGui = game:GetService("CoreGui")
local PlayerGui = Players.LocalPlayer:WaitForChild("PlayerGui")

local suspiciousKeywords = {
    "watermark", "logo", "this was made by ringta", "orion", "kavo", "ui", "library", "notifier", "keysystem", "madeby"
}

local function destroyUIs(guiParent)
    for _, obj in ipairs(guiParent:GetDescendants()) do
        if obj:IsA("TextLabel") or obj:IsA("ImageLabel") or obj:IsA("TextButton") then
            local text = (obj.Text or obj.Name or ""):lower()
            for _, keyword in ipairs(suspiciousKeywords) do
                if text:find(keyword) then
                    pcall(function()
                        obj:Destroy()
                    end)
                    break
                end
            end
        elseif obj:IsA("ScreenGui") then
            for _, keyword in ipairs(suspiciousKeywords) do
                if obj.Name:lower():find(keyword) then
                    pcall(function()
                        obj:Destroy()
                    end)
                    break
                end
            end
        end
    end
end

task.spawn(function()
    while true do
        destroyUIs(CoreGui)
        destroyUIs(PlayerGui)
        task.wait(0.5)
    end
end)
