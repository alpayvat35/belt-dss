# Belt-DSS-China-Turkey

Build an advanced 'Global Supply Chain & Eco-Routing Dashboard' for an Industrial Engineering portfolio. Use a highly professional UI with Tailwind CSS, featuring a modern data-center aesthetic.

1. Interactive Inputs: Dropdowns for Origin (e.g., Shanghai, Shenzhen) and Destination (e.g., Izmir, Istanbul), Cargo Weight slider, and an Urgency Level selector.

2. Intermodal Routing Logic: Generate 3 route options automatically (e.g., Ocean+Truck, Direct Air, Rail+Ocean). For each, calculate dynamically: Total Cost ($), Total CO2 Emissions (kg), and Lead Time (Days).

3. Disruption Simulator: Add a toggle switch called 'Simulate Supply Chain Disruption (e.g., Canal Blockage)'. When active, dynamically increase Ocean/Sea transport times by 40% and costs by 20%, forcing the system to recommend a different route.

4. Data Visualizations: Use Recharts to include a Radar Chart comparing the 3 route options across Cost Efficiency, Speed, and Eco-Friendliness. 

5. Smart Output: A highlighted 'System Recommendation' card that uses an algorithm to pick the best overall trade-off based on the user's selected Urgency Level.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://belt-dss.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a2d46abc-4758-4c1c-a143-a7c5a6e0e357).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
