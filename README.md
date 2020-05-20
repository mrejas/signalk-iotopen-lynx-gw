# signalk-iotopen-lynx-gw

Signalk to IoT Open Lynx Gateway is a simple way to get data from your boat
running [Signalk Node Server](https://signalk.org) to the IoT platform Lynx by
[IoT Open](https://iotopen.se). By doing this you can store and analyze the
data using all the tools available for Lynx, e.g. displaying data with Grafana
or react on events with node-red. It is even possible to turn on a lamp or
interact with your smart home from the boat. One example is to flash a light if
your boat leaves the dock. There are lots of possibilites and it is fun!

## Features

* Exports chosen paths to Lynx
* Creates the functions in Lynx automatically

## Usage

Install from the Appstore in Signal K. Go to Server -> Plugin Config and configure it. From Lynx you will need the following information:

* Hostname
* Mqtt port
* API Key
* Installation ID
* Client ID

You can get all this from your Lynx account.

## Screenshots

Config screen:

![signalk-integration1](https://user-images.githubusercontent.com/3830271/82436494-3436cd00-9a96-11ea-86c6-347ff58b8845.png)

Functions in Lynx

![lynx](https://user-images.githubusercontent.com/3830271/82440643-f8533600-9a9c-11ea-982c-00ef83b2bb40.png)

Graphs in Grafana

![grafana](https://user-images.githubusercontent.com/3830271/82440651-fab59000-9a9c-11ea-962e-1c9943391d81.png)
