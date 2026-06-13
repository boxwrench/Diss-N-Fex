<p align="center">
  <img src="images/banner.svg" alt="Diss N Fex Logo" width="850">
</p>

<p align="center">
  <strong>An arcade-style drinking water disinfection simulator. You are the last barrier between the raw water and the public.</strong><br>
  <em>Built for fun (and a little regulatory mischief) by <strong>Keith Wilkinson</strong>, operator and author of the water infrastructure blog <a href="https://www.title22.org">www.title22.org</a>.</em>
</p>

<p align="center">
  <a href="https://boxwrench.github.io/Diss-N-Fex/">
    <img src="https://img.shields.io/badge/PLAY%20NOW-LIVE%20ON%20GITHUB%20PAGES-blueviolet?style=for-the-badge&logo=githubpages&logoColor=white" alt="Play Live">
  </a>
</p>

<p align="center">
  <a href="https://www.waterboards.ca.gov/drinking_water/certlic/drinkingwater/">
    <img src="https://img.shields.io/badge/Compliance-California%20Title%2022-brightgreen?style=for-the-badge&logo=googledrive&logoColor=white" alt="Title 22 Status">
  </a>
  <a href="https://www.epa.gov/dwreginfo/surface-water-treatment-rules">
    <img src="https://img.shields.io/badge/Treatment%20Barriers-6%20Active-blue?style=for-the-badge&logo=water&logoColor=white" alt="Disinfection Barriers">
  </a>
  <a href="https://www.title22.org">
    <img src="https://img.shields.io/badge/Operator%20Rank-Grade%20V%20Superintendent-orange?style=for-the-badge&logo=opsgenie&logoColor=white" alt="Operator Rank">
  </a>
</p>

---

## ⚡ SCADA Live Telemetry Feed

> Contact basin receiving raw water. Operator login verified. Residual nominal. Pathogen load: **rising**.
> Standard operating criteria per **California Code of Regulations (CCR) Title 22 §64449**.

<p align="center">
  <img src="images/scada_monitor.svg" alt="SCADA Real-time Dashboard" width="800">
</p>

---

## 💧 The Premise

Welcome to **Diss N Fex**, where you operate a dangerously over-powered chemical dosing platform — the **Operator Rig** — standing between a river full of microbes and the clearwell that feeds the city.

The enemies aren't aliens or zombies. They're **bacteria, viruses, cysts, and biofilms**, politely disguised as ordinary people trying to stroll through your contact basin. Your job: keep them out of the effluent line by any (chemically sound) means necessary.

Hold your residual. Watch your turbidity. Audit your contact time. And whatever you do, **do not let the Superbug King reach the clearwell.**

*(Under the hood the engine keeps a few generic names for portability, but the game you're playing is all real water-treatment chemistry — chlorine, ozone, UV, coagulant, backwash, and pH shock.)*

---

## 🎮 How to Operate the Rig

### ⌨️ Keyboard & Mouse

| Input | Barrier | What it does |
| :--- | :--- | :--- |
| **`W` `A` `S` `D`** / **Arrows** | Rig Guidance | Move the Operator Rig around the contact basin. |
| **`Spacebar`** (hold) | **Chlorine Contact Spray** | Continuous chlorine disinfection. Your bread and butter. |
| **`E`** / **Left-Click** | **Ozone Diffuser** | Heavy oxidant bubbles for targeted treatment. |
| **`Q`** / **Right-Click** | **UV Disinfection Pulse** | High-voltage UV blast — big AoE DNA damage. |
| **`R`** | **Coagulant Injection** | Clumps pathogens so they take **1.3×** damage and shatter. |
| **`F`** | **Filter Backwash Vortex** | A vortex that sweeps up and filters out clustered pathogens. |
| **`T`** | **pH Shock Zone** | Slows pathogens **60%** and multiplies all damage by **1.5×**. |

> All action keys now **auto-fire while held** — no more mashing. Each barrier still respects its own recharge, so you can't cheese it.

### 📱 Touch (phones & tablets)

The game now plays on a touchscreen, no keyboard required:

* **Drag the left side** of the screen to steer the rig — a virtual pad follows your thumb.
* **Tap the labeled buttons** on the right to fire each barrier (they appear as you unlock them).
* **Hold the CL button** for continuous chlorine spray.

### 🆕 First shift?

New operators get an on-screen **controls cheat-sheet** during the first cycle, and every barrier announces its hotkey the moment it unlocks. Nobody gets thrown in the deep end of the basin.

---

## 🔬 Pathogen & Impurity Manifest

As flow rates climb, new pathogens unlock. Keep an eye on your SCADA alerts and counter their quirks.

<details>
<summary>👁️ Open the Microbiological Database</summary>
<br>

| Pathogen | Disguised As | HP | Operational Profile |
| :--- | :--- | :--- | :--- |
| **Bacillus** | Business Man | 1 | Basic rod bacteria. Wiggles its cilia along at standard speed. |
| **Coccus** | Business Woman | 1 | Sphere-shaped bacteria; travels in clusters. |
| **Amoeba** | Tourist | 1 | Slow protozoan that keeps stopping to "sample the conditions." |
| **Flagellate** | Jogger | 1 | High-mobility; zips across the basin. |
| **Endospore** | Raincoat Person | 1 | Dormant spore with **80% resistance** to basic chlorine spray. |
| **Biofilm Germ** | Umbrella Person | 1 | Slime layer blocks chlorine from above entirely. |
| **Protozoan** | Old Lady | 1 | Very slow, ciliated — and *extremely* sensitive to UV. |
| **Budding Yeast** | Dog Walker | 1 | Multiplies by budding; trails a connected daughter cell. |
| **Juggling Virus** | Street Performer | 1 | Stationary capsid that juggles viral nodes to infect nearby water. |
| **Pathogen Cyst** | Construction Worker | 3 | Thick-walled and tough; shrugs off **30%** of chlorine. |
| **Biofilm Gladiator** | Riot Police | 4 | Heavy armor plating; rejects physical force and shields neighbors. |
| **Mutator Cell** | Scientist | 1 | Unstable; rewrites its own DNA in real time. |
| **Superbug King** (Boss) | Mayor / VIP | 500 | The big one. Spawns shield-protein bodyguards and marches for the effluent line. |

</details>

---

## 🧪 Emergency Override Protocols (Secret Combos)

Collect falling chemical aids, stack them in your inventory, and trigger the right combination to unleash a **SCADA Emergency Override** — screen-clearing effects that reset the basin in spectacular fashion.

<details>
<summary>⚡ Unlock the Secret Combo Formulas</summary>
<br>

1. **`EMERGENCY OVERRIDE`** — Stack **2× Jar Test Lamp** + **1× Tracer Dye**. Smites up to 20 random pathogens with electrical surges while the screen shakes.
2. **`FLASH COAGULATION`** — Stack **3× Flash Coagulant**. Instantly freezes the whole basin solid.
3. **`PLANT UPSIZE`** — Stack **2× Oxidant Dose Boost** + **1× Operator Lift**. Your rig goes *kaiju* for 20 seconds; everything hits harder.
4. **`LONG CONTACT HOLD`** — Stack **3× Contact Basin Hold**. Bends time; pathogens crawl at 8% speed while you work.
5. **`MOBILE UV LAMP`** — Stack **2× UV Lamp Drone** + **1× UV Lamp Bank**. Spawns an autonomous orb that hunts pathogens and strips shields.
6. **`CLEARWELL SURGE`** — Stack **3× Chlorine Residual Boost**. Floods the basin with finished water to wash everything out.
7. **`CONTACT CASCADE`** — Stack **3× UV Lamp Drone**. Chains current pathogen-to-pathogen in a feedback loop.
8. **`DOUBLE TRACER STUDY`** — Stack **2× Tracer Dye**. Lures everything on screen and spawns 20 more into your spray.
9. **`BREAKPOINT CHLORINATION`** — Stack **3× Breakpoint Chlorine**. Ignores all resistance and melts shielding.
10. **`UV OVERDRIVE`** — Stack **3× UV Lamp Bank**. The UV generator auto-zaps random pathogens nonstop.

</details>

---

## 🛠️ Tech & How to Run

Runs entirely in the browser on native web tech — no frameworks, bundlers, or servers.

* **Graphics**: HTML5 Canvas with dynamic resolution scaling.
* **Engine**: custom 2D collision, movement, particles, and a modular system architecture.
* **Audio**: multi-channel synth sound effects and a retro soundtrack.
* **Saves**: four local save slots with automatic migration — your high score and progress carry over between versions.

**Just want to play?** → **[Launch the live build](https://boxwrench.github.io/Diss-N-Fex/)**

**Run it locally:**

```bash
git clone https://github.com/boxwrench/Diss-N-Fex.git
cd Diss-N-Fex
# open index.html directly, or for full audio:
npx http-server ./
```

---

## ✍️ About the Author

**Keith Wilkinson** is a veteran water industry professional and treatment plant operator based in California.

Through his blog, [Title 22 (www.title22.org)](https://www.title22.org), Keith writes about public water systems, federal guidelines, engineering strategies, cybersecurity, and the day-to-day realities of keeping drinking water safe.

* **Read the Newsletter**: [title22.substack.com](https://title22.substack.com)
* **Check out more projects**: [projects.title22.org](https://projects.title22.org)

---

<p align="center">
  <sub><strong>Disclaimer:</strong> This simulator is for entertainment purposes only. The chemical dosing rates, UV charge times, and backwashes depicted in this game do not represent actual water engineering calculations or safe drinking water operating parameters. Please do not attempt to run a municipal water plant using an Operator Rig.</sub>
</p>
