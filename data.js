/* ================================================================
   TTD Arjitha Seva — Complete Temple & Seva Map
   Scraped live from ttdevasthanams.ap.gov.in on 26/05/2026
   Total: 13 Temples, 80+ Sevas
   ================================================================ */

const TTD_TEMPLE_SEVA_MAP = {

  "Srivari Temple - Tirumala": [
    "Unjal Seva",
    "Arjitha Brahmotsavam",
    "Kalyanotsavam",
    "Sahasra Deepalankara Seva",
    "Jyestabhishekam",
    "Pavithrotsavam",
    "Pushpayagam",
    "Float Festival",
    "Salakatla Vasanthotsavam"
  ],

  "Sapthagiri Gau Pradakshina Shala - Tirupati": [
    "Sri Srinivasa Divyaanugraha Homam"
  ],

  "Sri Govindarajaswamy Temple - Tirupathi": [
    "Kumkumarchana",
    "Veda Ashirvachanam",
    "Unjal Seva",
    "Pavithrotsavam"
  ],

  "Sri Padmavathi Ammavari Temple - Tiruchanoor": [
    "Suprabhatham",
    "Suprabhatham (Friday)",
    "Kalyanotsavam",
    "Astadala Pada Padmaradhanam",
    "Thiruppavada",
    "Vastralankara Seva",
    "Vastralankara Seva (Thaimasam)",
    "Abhishekam",
    "Abhishekam (Thaimasam)",
    "Lakshmi Puja",
    "Pushpanjali Seva",
    "Astothara Satakalasabhishekam",
    "Laksha Kumkumarchana",
    "Vasanthotsavam",
    "Varalakshmi Vratham",
    "Suprabhatham (Vasanthotsavam)",
    "Suprabhatham (Koilalwar Thirumanjanam Day)",
    "Suprabhatham (Varalakshmi Vratham Day)",
    "Pavitrotsavam",
    "Pushpayagam",
    "Suprabhatham Dhanurmasam",
    "Suprabhatham Dhanurmasam (Friday)",
    "Astadala Pada Padmaradhanam Dhanurmasam",
    "Thiruppavada Dhanurmasam",
    "Vastralankara Seva Dhanurmasam",
    "Abhishekam Dhanurmasam",
    "Pushpanjali Seva Dhanurmasam",
    "Suprabhatham (Thaimasam Friday)",
    "Pavitrotsavam (First Day)",
    "Pavitrotsavam (Second Day)",
    "Pavitrotsavam (Third Day)",
    "Suprabhatham (Chandra Grahanam)",
    "Suprabhatham Dhanurmasam (Thursday and Friday)",
    "Abhishekam (Vasanthotsavam)",
    "Vastralankara Seva (Vasanthotsavam)"
  ],

  "Sri KalyanaVenkateswaraSwamy Temple - Srinivasamangapuram": [
    "Kalyanotsavam",
    "Kalyana Kankanam",
    "Veda Ashirvachanam",
    "Swarna Pushpaarchana",
    "Astothara Satha Kalasabhishekam",
    "Thiruppavada",
    "Abhishekam to Moolavaru",
    "Vasthralankara Seva",
    "Pavithrotsavam",
    "Vasthralankara Seva (3:30 AM)",
    "Vasthralankara Seva (4:00 AM)",
    "Abhishekam to Moolavaru (3:30 AM)",
    "Abhishekam to Moolavaru (4:00 AM)"
  ],

  "Sri Prasanna Venkateswara Swamy Temple - Appalayagunta": [
    "Abhishekam",
    "Vastralankarana Seva",
    "Kalyanotsavam",
    "Astadala Padapadmaradhana",
    "Astothara Satakalishabhishekam",
    "Arjitha Kalyanotsavam",
    "Vastralankarana Seva (Pavitrotsavams)",
    "Abhishekam (Pavitrotsavams)"
  ],

  "Surya Narayana Swamy Temple - Tiruchanoor": [
    "Abhishekam to Moolavarlu"
  ],

  "Srinivasa Temple - Tiruchanoor": [
    "Abhishekam to Moolavarlu"
  ],

  "Sri Kalyana Venkateswara Swamy Temple - Narayanavanam": [
    "Kalyanotsavam",
    "Abhishekam to Sri Kalyana Venkateswara Swamy Varu",
    "Abhishekam to Sri Padmavathi Ammavaru",
    "Astadalapada padmaradhana"
  ],

  "Sri KodandaRamaSwamy Temple - Vontimitta": [
    "Abhishekam on Saturday",
    "Kalyanotsavam on Pournami day",
    "Swarna Pushpaarchana on Sunday"
  ],

  "Sri Kodanda Rama Swamy Temple - Tirupathi": [],

  "Sri Chennakeshava Swamy Temple - Thallapaka": [
    "Arjitha Kalyanotsavam"
  ],

  "Sri Venugopala Swamy Temple - Karvetinagaram": [
    "Arjitha Kalyanothsavam",
    "Sri Varamahalakshmi Vratham",
    "Arjitha Kalyanotsavam (SriRamula Vari Kalyanam)"
  ]

};

/* ================================================================
   TTD Special Entry — Hourly Time Slots
   Available every hour from 10 AM to 10 PM
   Format matches TTD website: "Slot Time X:00 am/pm"
   ================================================================ */

const TTD_SPECIAL_ENTRY_SLOTS = [
  "10:00 am", "11:00 am", "12:00 pm",
  "1:00 pm", "2:00 pm", "3:00 pm",
  "4:00 pm", "5:00 pm", "6:00 pm",
  "7:00 pm", "8:00 pm", "9:00 pm", "10:00 pm"
];