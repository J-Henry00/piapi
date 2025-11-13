# piapi

## Description

piAPI is an API server for displaying Raspberry PI system information.

## Features

- Provides system information about Raspberry Pi.
- Built with Node.js and Express.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/J-Henry00/piapi.git
    cd piapi
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the root directory by copying `template.env` and filling in the values:

```bash
cp template.env .env
```

Edit the `.env` file with your specific configurations:

```ini
PORT=       # Port for the API server (e.g., 3000)
CLOUDFLARE_API= # Your Cloudflare API key (if using Cloudflare)
CLOUDFLARE_ZONE= # Your Cloudflare Zone ID
CLOUDFLARE_TUNNEL= # Cloudflare Tunnel ID
CLOUDFLARE_ACCOUNT= # Cloudflare Account ID
PUBLIC_IP_KEY= # Key for a public IP service (e.g., ipify.org API key)
RESTART_KEY= # Key for restarting services (e.g., pm2)
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## Technologies Used

- Node.js
- Express.js
- pm2
- systeminformation
- dockerode
- axios
- chart.js
- canvas
- cors
- dotenv
- ping

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

J-Henry00
