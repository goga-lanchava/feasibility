# EMPA-REG OUTCOME (BI 1245.25): parsed-criteria corrections to apply

Source: protocol v5, 15 Oct 2013, sections 3.3.2 and 3.3.3. Parsed with Rule-based NLP (26 rules).
Applied 14 Oct 2026 in the open app tab: 6 rules switched off with these reasons (the Essential flag was removed from Hypersensitivity first, as the app requires); Stroke/TIA was restored, see below. In the criteria table: untick the rule, then type the reason in the box that appears.

| Done | Rule as parsed | Action | Reason to record |
|---|---|---|---|
| [x] | INC Sex = 'female' | Off | Parser misread: inclusion 2 admits male and female patients. |
| [x] | INC ON_MED(insulin) | Off | Parser misread: insulin is optional background therapy; protocol requires only a stable dose (±10% over 12 weeks), which needs site confirmation. |
| [x] | INC Pregnancy / lactation | Off | Parser misread: pregnancy appears only in exclusion 11. |
| [x] | EXC Pregnancy / lactation | Keep | Do not click "Exempt the study indication"; choose "Keep as written" if the warning remains. Contraception part is a site check. |
| [x] | EXC Obesity | Off | Parser misread: exclusion 9 concerns anti-obesity drugs within 3 months or unstable weight; obesity is allowed (BMI ≤ 45, inclusion 5). |
| [x] | EXC Hypertension | Off | Exclusion 16 applies only in South Africa (BP > 160/100 mmHg at screening). |
| [x] | EXC Stroke / TIA | **Keep (corrected)** | The rule does carry its window ("within 2 months", shown as a chip and applied to dated records); only the Logic column hid it. It was switched off by mistake and has been restored (on, safety-essential). The Logic column now shows the window. |
| [x] | EXC Hypersensitivity | Off | Not in protocol; exclusion 8 is contraindication to background therapy per local label (investigator judgement). |
| [x] | INC HbA1c 7–10 | Keep | Note: drug-naïve upper limit 9.0% not applied (site check). |

Site-confirmation items (not computable from typical extracts): stable antidiabetic therapy 12 weeks; drug-naïve HbA1c ≤ 9.0%; exclusion 5 (bariatric / malabsorptive GI surgery); exclusion 8; exclusion 9; contraception (exclusion 11); ACS/stroke/TIA within 2 months (exclusion 15).

Current inputs: indication Type 2 diabetes mellitus; target 7000; enrollment window 24 months (§7.6 accrual assumption); proposed countries blank (protocol gives only ~40 countries / ~650 centres).
