local soundIds = {}
local currentToken = 0

local particlesData = nil
local soundsData = nil

CreateThread(function()
    local partFile = LoadResourceFile(GetCurrentResourceName(), "data/particles.json")
    if partFile then
        particlesData = json.decode(partFile)
    else
        print("^1[mri_devtools] Error: data/particles.json not found!^7")
    end

    local soundFile = LoadResourceFile(GetCurrentResourceName(), "data/soundNames.json")
    if soundFile then
        soundsData = json.decode(soundFile)
    else
        print("^1[mri_devtools] Error: data/soundNames.json not found!^7")
    end
end)

RegisterNUICallback('uiLoaded', function(data, cb)
    while not particlesData or not soundsData do
        Wait(50)
    end
    SendNUIMessage({
        action = "LOAD_DATABASES",
        particles = particlesData,
        sounds = soundsData
    })
    cb(1)
end)

local function stopAllSounds()
    for id in pairs(soundIds) do
        if not HasSoundFinished(id) then
            StopSound(id)
        end
        ReleaseSoundId(id)
        soundIds[id] = nil
    end
end

RegisterNUICallback('playSound', function(data, cb)
    stopAllSounds()
    currentToken = currentToken + 1
    local token = currentToken

    local soundHandle = GetSoundId()
    soundIds[soundHandle] = true
    PlaySoundFrontend(soundHandle, data.audioName, data.audioRef, true)

    CreateThread(function()
        Wait(150)
        while soundIds[soundHandle] and not HasSoundFinished(soundHandle) do
            Wait(100)
        end
        if soundIds[soundHandle] then
            ReleaseSoundId(soundHandle)
            soundIds[soundHandle] = nil
        end
        if token == currentToken then
            SendNUIMessage({ action = "soundFinished", soundId = data.audioId })
        end
    end)
    cb(1)
end)

RegisterNUICallback('stopSounds', function(data, cb)
    currentToken = currentToken + 1
    stopAllSounds()
    cb(1)
end)

-- --- Particle Viewer Logic ---
local ParticleViewer = {}
ParticleViewer.ParticleHandle = nil
ParticleViewer.isPlaying = false
ParticleViewer.Data = {
    Dictionary = nil,
    Fx = nil,
    Scale = 1.0,
    Color = { r = 1.0, g = 1.0, b = 1.0, a = 1.0 },
    Evolution = {}
}

-- Orbit camera state
ParticleViewer.Cam = nil
ParticleViewer.camActive = false
ParticleViewer.camHeading = 0.0
ParticleViewer.camPitch = 10.0
ParticleViewer.camDistance = 2.5

function ParticleViewer:Stop()
    if DoesParticleFxLoopedExist(self.ParticleHandle) then
        RemoveParticleFx(self.ParticleHandle, false)
    end
end

function ParticleViewer:Play()
    if not self.isPlaying then return end
    local localPlayer = PlayerPedId()

    if DoesParticleFxLoopedExist(self.ParticleHandle) then
        RemoveParticleFx(self.ParticleHandle, false)
    end

    if not self.Data.Dictionary or not self.Data.Fx then return end

    RequestNamedPtfxAsset(self.Data.Dictionary)
    while not HasNamedPtfxAssetLoaded(self.Data.Dictionary) do
        Citizen.Wait(10)
    end

    UseParticleFxAssetNextCall(self.Data.Dictionary)

    if not DoesParticleFxLoopedExist(self.ParticleHandle) then
        self.ParticleHandle = StartParticleFxLoopedOnEntity(
            self.Data.Fx,
            localPlayer,
            0.0,
            1.0,
            0.0,
            0.0,
            0.0,
            0.0,
            tonumber(self.Data.Scale) + 0.0,
            false,
            false,
            false,
            false
        )
        self:UpdateColor()
        self:UpdateEvolution()
    end
end

function ParticleViewer:SetPlayingState(state)
    self.isPlaying = state
    if self.isPlaying then
        self:Play()
        DisableIdleCamera(true)
    else
        self:Stop()
        DisableIdleCamera(false)
    end
end

function ParticleViewer:UpdateScale()
    if not self.isPlaying then return end
    if DoesParticleFxLoopedExist(self.ParticleHandle) then
        SetParticleFxLoopedScale(self.ParticleHandle, tonumber(self.Data.Scale) + 0.0)
    end
end

function ParticleViewer:UpdateColor()
    if not self.isPlaying then return end
    if DoesParticleFxLoopedExist(self.ParticleHandle) then
        SetParticleFxLoopedColour(self.ParticleHandle, tonumber(self.Data.Color.r) + 0.0, tonumber(self.Data.Color.g) + 0.0, tonumber(self.Data.Color.b) + 0.0, false)
        SetParticleFxLoopedAlpha(self.ParticleHandle, tonumber(self.Data.Color.a) + 0.0)
    end
end

function ParticleViewer:UpdateEvolution()
    if not self.isPlaying then return end
    if DoesParticleFxLoopedExist(self.ParticleHandle) then
        for k, v in pairs(self.Data.Evolution) do
            SetParticleFxLoopedEvolution(self.ParticleHandle, k, tonumber(v) + 0.0, false)
        end
    end
end

function ParticleViewer:UpdateCamera()
    if not self.camActive or not self.Cam then return end
    local ped = PlayerPedId()
    local center = GetOffsetFromEntityInWorldCoords(ped, 0.0, 1.0, 0.0)

    local rh = math.rad(self.camHeading)
    local rp = math.rad(self.camPitch)
    local horiz = self.camDistance * math.cos(rp)

    local camX = center.x + horiz * math.sin(rh)
    local camY = center.y - horiz * math.cos(rh)
    local camZ = center.z + self.camDistance * math.sin(rp)

    SetCamCoord(self.Cam, camX, camY, camZ)
    PointCamAtCoord(self.Cam, center.x, center.y, center.z)
end

function ParticleViewer:StartCamera()
    if self.camActive then return end
    local ped = PlayerPedId()
    self.camHeading = GetEntityHeading(ped) + 180.0
    self.camPitch = 10.0
    self.camDistance = 2.5

    self.Cam = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
    self.camActive = true
    self:UpdateCamera()
    SetCamActive(self.Cam, true)
    RenderScriptCams(true, false, 0, true, true)

    Citizen.CreateThread(function()
        while self.camActive do
            self:UpdateCamera()
            Citizen.Wait(0)
        end
    end)
end

function ParticleViewer:StopCamera()
    if not self.camActive then return end
    self.camActive = false
    RenderScriptCams(false, false, 0, true, true)
    if self.Cam then
        DestroyCam(self.Cam, false)
        self.Cam = nil
    end
end

-- --- UI Controller ---
local isUIOpen = false

local function setUIDisplay(state, defaultTab)
    isUIOpen = state
    SetNuiFocus(state, state)
    SendNUIMessage({
        action = "SET_OPEN_STATE",
        state = state,
        tab = defaultTab
    })
    if state then
        InvalidateIdleCam()
        InvalidateVehicleIdleCam()
        -- Start camera orbit loop ONLY if we are in particle tab, or start it anyway and let it run
        ParticleViewer:StartCamera()
    else
        ParticleViewer:StopCamera()
        ParticleViewer:Stop()
        ParticleViewer.isPlaying = false
        stopAllSounds()
    end
end

RegisterNUICallback("closeInterface", function(data, cb)
    setUIDisplay(false)
    cb(1)
end)

RegisterNUICallback("SET_PLAYING_STATE", function(data, cb)
    ParticleViewer:SetPlayingState(data.state)
    cb({})
end)

RegisterNUICallback("CHANGE_PARTICLE", function(data, cb)
    ParticleViewer.Data.Dictionary = data.dictionary
    ParticleViewer.Data.Fx = data.particleFx
    ParticleViewer:Play()
    cb({})
end)

RegisterNUICallback("CHANGE_PARTICLE_SCALE", function(data, cb)
    ParticleViewer.Data.Scale = data.scale
    ParticleViewer:UpdateScale()
    cb({})
end)

RegisterNUICallback("CHANGE_PARTICLE_COLOR", function(data, cb)
    ParticleViewer.Data.Color = data.color
    ParticleViewer:UpdateColor()
    cb({})
end)

RegisterNUICallback("CHANGE_EVOLUTION_PROPERTY", function(data, cb)
    ParticleViewer.Data.Evolution[data.name] = data.value
    ParticleViewer:UpdateEvolution()
    cb({})
end)

RegisterNUICallback("CAMERA_ROTATE", function(data, cb)
    if ParticleViewer.camActive then
        local dx = tonumber(data.dx) or 0.0
        local dy = tonumber(data.dy) or 0.0
        ParticleViewer.camHeading = ParticleViewer.camHeading - dx * 0.25
        ParticleViewer.camPitch = math.max(-80.0, math.min(80.0, ParticleViewer.camPitch - dy * 0.25))
    end
    cb({})
end)

RegisterNUICallback("CAMERA_ZOOM", function(data, cb)
    if ParticleViewer.camActive then
        local delta = tonumber(data.delta) or 0.0
        ParticleViewer.camDistance = math.max(0.8, math.min(12.0, ParticleViewer.camDistance + delta))
    end
    cb({})
end)

-- --- Chat Commands ---
RegisterCommand("devtools", function()
    setUIDisplay(not isUIOpen, "particles")
end)


-- --- Exports ---
exports("Open", function(defaultTab)
    setUIDisplay(true, defaultTab or "particles")
end)

exports("Close", function()
    setUIDisplay(false)
end)
