# Kitchen Printer Setup Guide

## Overview
This system enables direct printing of orders to kitchen printers through cash registers and POS systems. It supports a wide range of hardware from vintage cash registers to modern POS terminals.

## Supported Hardware

### Cash Register Systems
- **Vintage (1879-1950s)**: Ritty's Incorruptible Cashier, National Cash Register (NCR) Models 1-50, Hallwood, Ideal, Sun, Peck, Union, American, Chicago
- **Mid-Century (1950s-1980s)**: Brandt, Hopkins & Robinson, Kolter & Seitz, Hough, Burroughs, Gross, Sweda, Sperry, Remington Rand
- **Electronic Era (1980s-2000s)**: Olympia, Anker, Addo, IBM, Casio, Sharp, Royal, Panasonic, Fujitsu, Toshiba TEC, Olivetti, Samsung

### Modern POS Systems
- **Cloud POS**: Square, Clover, Toast, Lightspeed, Shopify POS, TouchBistro, Revel Systems
- **Enterprise**: Wincor Nixdorf, Diebold, NCR Voyix
- **Compact**: Posiflex, Bematech, Sam4s
- **Payment Terminals**: Verifone, Ingenico, PAX, Sunmi, Newland, iMin

### Printer Hardware
- **Thermal Printers**: Epson TM series, Star Micronics TSP, Citizen CT-S
- **Impact Printers**: Epson TM-U220, Star SP700
- **Network Printers**: Any ESC/POS compatible network printer

## Setup Instructions

### 1. Access Printer Setup
1. Go to Admin Dashboard
2. Click "Kitchen Printers" button in the header
3. The printer setup modal will open

### 2. Quick Setup Options

#### USB Thermal Printer (Most Common)
1. Connect your thermal printer via USB
2. Select "Auto-detect USB printer" from dropdown
3. Click "Add Printer"
4. Click "Connect All" to establish connection

#### Network Printer
1. Find your printer's IP address (check printer settings or network admin panel)
2. Select "Network printer (IP)" from dropdown
3. Enter the IP address (e.g., 192.168.1.100)
4. Click "Add Printer"
5. Click "Connect All"

#### POS System Integration
1. Select your POS system from the dropdown:
   - Square POS Terminal
   - Clover Station
   - Generic USB thermal printer
2. Click "Add Printer"
3. Follow any system-specific prompts

### 3. Testing
1. After adding and connecting printers, click "Test Print"
2. A sample kitchen order will be printed
3. Verify the format and readability

## Browser Compatibility

### Required Browser Features
- **USB Printing**: Chrome 89+, Edge 89+ (requires HTTPS)
- **Serial Printing**: Chrome 89+, Edge 89+ (requires HTTPS)
- **Bluetooth Printing**: Chrome 56+, Edge 79+
- **Network Printing**: All modern browsers

### HTTPS Requirement
USB and Serial printer access requires HTTPS in production. For local development, you can use:
- `localhost` (works with HTTP)
- Chrome with `--unsafely-treat-insecure-origin-as-secure` flag

## Integration with Cash Register Systems

### For Vintage Cash Registers
1. **Serial Connection**: Use a USB-to-Serial adapter
2. **Parallel Connection**: Use a USB-to-Parallel adapter
3. **Network Bridge**: Use a serial-to-network converter

### For Modern POS Systems
1. **Direct Integration**: Most modern systems support network printing
2. **API Integration**: Use the system's API to trigger prints
3. **Webhook Integration**: Set up webhooks to automatically print new orders

## Automatic Order Printing

### Setup Automatic Printing
1. Configure at least one kitchen printer
2. Orders will automatically print when:
   - Status changes to "pending"
   - Order contains food items
   - Printer is connected and ready

### Manual Printing
Use the print buttons available in:
- Order management pages
- Individual order cards
- Admin dashboard

## Troubleshooting

### Common Issues

#### Printer Not Detected
- **USB**: Check cable connection, try different USB port
- **Network**: Verify IP address, check network connectivity
- **Permissions**: Ensure browser has permission to access USB/Serial

#### Print Quality Issues
- **Faded Print**: Replace thermal paper or ribbon
- **Garbled Text**: Check character encoding settings
- **Cut Issues**: Verify paper cutter functionality

#### Connection Problems
- **USB**: Try different cable or port
- **Network**: Check firewall settings, verify printer IP
- **Serial**: Verify baud rate and port settings

### Error Messages

#### "No compatible printer detected"
- Ensure printer is powered on and connected
- Try manual configuration instead of auto-detect
- Check USB cable and connections

#### "Connection failed"
- Verify printer is not in use by another application
- Check network connectivity for network printers
- Restart printer and try again

#### "Print failed"
- Check paper supply
- Verify printer is online and ready
- Check for paper jams or errors

## Advanced Configuration

### Custom Printer Settings
```typescript
const customConfig: PrinterConfig = {
  type: 'thermal',
  brand: 'Custom',
  model: 'Model-X',
  interface: 'usb',
  paperWidth: 48, // mm
  characterSet: 'CP437',
  baudRate: 9600 // for serial
}
```

### Network Printer Setup
```typescript
const networkConfig: PrinterConfig = {
  type: 'thermal',
  brand: 'Epson',
  model: 'TM-T88V',
  interface: 'ethernet',
  ipAddress: '192.168.1.100',
  paperWidth: 48
}
```

### Multiple Printer Setup
You can configure multiple printers for redundancy:
1. Add multiple printers with different IDs
2. System will attempt to print to all connected printers
3. Useful for busy kitchens with backup printers

## Kitchen Receipt Format

### Standard Format
```
=== KITCHEN ORDER ===

Order #: ORD-001
Time: 2:30 PM
Type: DINE-IN
Table: 5
Server: John

------------------------

ITEMS:
2x Espresso
   + Extra shot
   + No sugar

1x Croissant
   NOTE: Extra butter

------------------------

SPECIAL INSTRUCTIONS:
Rush order - customer waiting

------------------------
Printed: 2:30:15 PM
```

### Customization
The receipt format includes:
- Order number and timestamp
- Customer and table information
- Item quantities and modifications
- Special cooking instructions
- Priority indicators for rush orders

## Security Considerations

### Network Printers
- Use secure network segments for printer traffic
- Consider VPN for remote printer access
- Regular firmware updates for network-enabled printers

### USB/Serial Printers
- HTTPS required for browser security
- Local network access only
- No external internet access needed

## Maintenance

### Regular Tasks
1. **Clean Print Heads**: Monthly for thermal printers
2. **Replace Paper**: Monitor paper levels
3. **Update Firmware**: Check for printer firmware updates
4. **Test Connections**: Weekly connection tests

### Performance Monitoring
- Monitor print success rates in admin dashboard
- Check printer status indicators
- Review error logs for issues

## Support

### Getting Help
1. Check browser console for error messages
2. Verify printer compatibility in setup guide
3. Test with different browsers if issues persist
4. Contact system administrator for network printer issues

### Reporting Issues
When reporting printer issues, include:
- Printer make and model
- Connection type (USB, Network, etc.)
- Browser and version
- Error messages from console
- Steps to reproduce the issue