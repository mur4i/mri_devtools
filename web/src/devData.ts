export interface SoundEntry {
  AudioName: string
  AudioRef?: string
}

export const devParticles: Record<string, string[]> = {
  core: [
    'bul_gravel_heli',
    'ent_dst_concrete_large',
    'fire_wrecked_plane_cockpit',
    'proj_flare_trail',
    'exp_grd_grenade_lod',
  ],
  core_snow: [
    'cs_mich1_spade_dirt_throw',
    'cs_mich1_spade_dirt_impact',
    'cs_mich1_spade_dirt_trail',
  ],
  scr_rcbarry2: [
    'scr_clown_appears',
    'scr_clown_death',
    'scr_clown_bul',
    'scr_clown_bul_impact',
  ],
}

export const devSounds: SoundEntry[] = [
  { AudioName: '1st_Person_Transition', AudioRef: 'PLAYER_SWITCH_CUSTOM_SOUNDSET' },
  { AudioName: 'BACK', AudioRef: 'HUD_AMMO_SHOP_SOUNDSET' },
  { AudioName: 'FocusIn', AudioRef: 'HintCamSounds' },
  { AudioName: 'FocusOut', AudioRef: 'HintCamSounds' },
  { AudioName: 'NAV_LEFT_RIGHT', AudioRef: 'HUD_FRONTEND_DEFAULT_SOUNDSET' },
  { AudioName: 'NAV_UP_DOWN', AudioRef: 'HUD_FRONTEND_DEFAULT_SOUNDSET' },
  { AudioName: 'SELECT', AudioRef: 'HUD_FRONTEND_DEFAULT_SOUNDSET' },
  { AudioName: 'ERROR', AudioRef: 'HUD_AMMO_SHOP_SOUNDSET' },
  { AudioName: 'PICK_UP', AudioRef: 'HUD_FRONTEND_DEFAULT_SOUNDSET' },
  { AudioName: 'QUIT', AudioRef: 'HUD_FRONTEND_DEFAULT_SOUNDSET' },
]

