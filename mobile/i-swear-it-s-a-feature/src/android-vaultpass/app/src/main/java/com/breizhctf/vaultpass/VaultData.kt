package com.breizhctf.vaultpass

object VaultData {
    const val MASTER_PASSWORD = "Br3izh_M4st3r_2026_bRrrR!"

    val entries = listOf(
        VaultEntry(
            id = 1,
            title = "Gmail",
            username = "t4sty_cr0ustyyyy@gmail.com",
            password = "Gm41l_P3rs0_2024!",
            url = "https://mail.google.com",
            notes = "Compte perso principal",
            category = "Email"
        ),
        VaultEntry(
            id = 2,
            title = "GitHub",
            username = "t4sty_cr0ustyyyy-dev",
            password = "g1tHub_C0d3_S3cur3",
            url = "https://github.com",
            notes = "Projets perso et contributions OSS",
            category = "Dev"
        ),
        VaultEntry(
            id = 3,
            title = "OVH Cloud",
            username = "admin@t4sty_cr0ustyyyy.io",
            password = "0vH_Cl0ud_Infr4_2024",
            url = "https://www.ovhcloud.com/manager",
            notes = "VPS + stockage S3, datacenter Rennes",
            category = "Cloud"
        ),
        VaultEntry(
            id = 4,
            title = "SSH Serveur Prod",
            username = "root@192.168.1.42",
            password = "r00t_ssh_k3y_Pr0d!",
            url = "ssh://192.168.1.42:22",
            notes = "Serveur Debian, tunnel WireGuard actif",
            category = "Network"
        ),
        VaultEntry(
            id = 5,
            title = "Nextcloud",
            username = "t4sty_cr0ustyyyy",
            password = "N3xtCl0ud_S3lf_H0st",
            url = "https://cloud.breizhnet.local",
            notes = "Instance auto-hebergee, backup quotidien",
            category = "Cloud"
        ),
        VaultEntry(
            id = 6,
            title = "Jellyfin",
            username = "admin",
            password = "J3llyf1n_M3d1a_Srv!",
            url = "https://media.breizhnet.local",
            notes = "Serveur media local, port 8096",
            category = "Media"
        ),
        VaultEntry(
            id = 7,
            title = "Gitea (Self-hosted)",
            username = "t4sty_cr0ustyyyy",
            password = "G1t3a_L0c4l_D3v_K3y",
            url = "https://git.breizhnet.local",
            notes = "Repos prives, miroir GitHub",
            category = "Dev"
        ),
        VaultEntry(
            id = 8,
            title = "Breizh Secrets",
            username = "admin",
            password = "BZHCTF{t4sty_cr0ustyyyy}",
            url = "https://secrets.breizhctf.local",
            notes = "Portail interne CTF. Ne pas partager.",
            category = "CTF"
        )
    )
}
