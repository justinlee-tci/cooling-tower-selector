# Cooling Tower Selector

Cooling Tower Selector is a web-based application designed to assist engineers and project managers in selecting the most suitable cooling tower model based on project requirements. The application provides detailed specifications, performance data, and generates professional PDF reports.

## Features

- **Cooling Tower Model Selection**: Choose from a range of cooling tower models with detailed specifications.
- **Performance Analysis**: Calculate actual capacity and safety factors based on user inputs.
- **Dynamic Inputs**: Adjust the number of cells using a synchronized slider and text input.
- **PDF Report Generation**: Generate detailed reports with tower specifications, performance curves, and drawings.
- **Error Handling**: Robust error handling for data fetching and report generation.

## Technologies Used

- **Frontend**: React.js with Next.js
- **Backend**: Supabase (PostgreSQL as a service)
- **PDF Generation**: [pdf-lib](https://github.com/Hopding/pdf-lib)
- **Styling**: Tailwind CSS

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/cooling-tower-selector.git
   cd cooling-tower-selector
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Navigate through the steps to input project details and select a cooling tower model.
2. Adjust the number of cells using the slider or text input.
3. Generate a PDF report with detailed specifications and drawings.

## Project Structure

```
cooling-tower-selector/
├── app/
│   ├── components/          # Reusable components (e.g., GenerateReport.js)
│   ├── selection/           # Selection steps (e.g., Step2CoolingTowerSelection.js)
│   ├── viewSelection/       # View and manage selections
├── lib/
│   └── supabaseClient.js    # Supabase client configuration
├── public/
│   ├── tower-drawings/      # Tower model drawings (PNG/JPG)
│   ├── foundation-drawings/ # Foundation drawings (PNG/JPG)
│   └── company-logo.jpg     # Company logo for reports
├── .env.local               # Environment variables
├── README.md                # Project documentation
└── package.json             # Project dependencies and scripts
```

## Known Issues

- Ensure all required images (tower drawings, foundation drawings) are available in the `public/` directory.
- Supabase database must be properly configured with the required tables:
  - `cooling_tower_models`
  - `cooling_tower_performance`

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature-name"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For inquiries, please contact:
- **Email**: inquiry@thermal-cell.com
- **Phone**: +6-06-799 6618 | +6-011-1218-9662
