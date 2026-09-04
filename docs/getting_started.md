<-- Welcome -->

## Welcome to the Lucy control panel.

This short getting-started guide will walk you through the basics of the control panel and help you get familiar with the main features.

> You can skip this guide with the button bellow.
> If you want to replay the guide, you can find it in the setting popup at the top right corner.

---

If you need more in-depth information, you can click the 'Documentation' button at any time or go to [this address](https://docs.sentience-robotics.fr/share/p1x9ikjkhf/p/public-documentation-EExgMX2REV).

Additionally, if you need specific information or want to exchange on the project, you can join our [community discord server](https://discord.gg/g4KNZ3eeBd), we'll be more than happy to exchange with you!

---

Thanks for using Lucy, it means a lot to us ❤️.

With that being said, let's get started!

<-- ROS 2 -->

Let's have a quick word about ROS 2.

> [ROS](https://www.ros.org/) (Robot Operating System) is a standard in the field of robotic.

Lucy use ROS 2 internaly to manage everything, from connecting to the physical actuators from displaying the number of connected controller.

---

The control panel has to connect to this bridge everytime, which is made automaticaly for you by default.
> If at any point you need to update the connection URL, or toggle the auto-connect feature, you can visit the setting popup.

<-- Control -->

> This is where you'll control your robot, and it's full of stuff, so let's go over the basics!

First thing first, you will need to take control from the other control applications. This can be achieve by using the 'Control robot' toggle.
> This security system ensure that no more than one controller is sending instruction to your robot.

---

## Sliders

The main part of the screen is occupied by the 'actuators categories', each of them contains multiple actuators.

> You will be able to assign each & every actuator to a category in the configuration page.

Each of this actuators has it's own control box, letting you update it position in real time.
Every slider comes with two indicators:
- The top green one indicate the default position for this actuators.
- The bottom blue one indicate the actual position. It will move more or less slowly depending on the physical configuration of the actuator.

<-- Poses & Animations -->

## Poses

In the top bar controls, you can find the 'Save pose' & 'Load pose' popups.

They will let you save every actuators position and load them at a later time when needed.

> Every pose is saved localy on your browser localStorage.

---

## Animations

The animation system uses the saved poses.

> Once at least two poses are created, you will be able to select them int he 'Manage animation' popup and create an animation with them.

<-- Sensors -->

For this part, we will need to travel a bit.

- On the bottom right corner, you will find the navigation bar, select the second option 'Sensors'.

> It sure look empty, let's fix it!

Using the drop-down menu, you can select every sensors you want to watch.

---

> We currently support direct data display & temperatures, with a graph.
> If you have a sensors which data cannot be displayed, feel free to create an [issue](https://github.com/Sentience-Robotics/lucy_control_panel/issues) or to [contact us](https://discord.gg/g4KNZ3eeBd) directly.

<-- Configuration -->

The configuration page is undergoing a complete refactor, usage guide will be updated soon.

In the meantime, if you need more information, please refer to our [online documentation](https://docs.sentience-robotics.fr/share/p1x9ikjkhf/p/public-documentation-EExgMX2REV).