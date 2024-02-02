# MiR Development

## Important Notes
```ALL FILES MIR REPLACED ARE IN ..\packages\studio-base\src\mir\```

Currently main is based on Foxglove release/v1.86.1

## Todo
Move the following files over from the original MiR Project

```ORIGINAL FILE``` -> ```NEW FILE NAME(S)```
- Markers.ts -> RenderableMarker.ts
- OccupancyGrids.ts -> OccupancyGrids.ts
- PointCloudsAndLaserScans.ts -> PointClouds.ts & LaserScans.ts
- PoseArrays.ts -> PoseArrays.ts
- DONE defaultLayout.ts -> defaultLayout.ts
- DONE ros.ts -> ros.ts

## Branches
- ```main``` - mir branch with latest foxglove release
- ```foxglove-main``` - branch in sync with Foxglove:main
- ```foxglove/release/***``` - release from Foxglove

## Dependencies
- Node.js v16.10+
- Git LFS

## Getting Started

1. Clone the repo
2. Run ```git lfs pull``` to ensure Git LFS objects are up to date
2. Run ```corepack enable``` and ```yarn install``` (should take 5 minutes to finish)
4. To run the project, refer to below

## Running the Project Locally
```sh
# To launch the app:
yarn install
yarn web:serve

# To launch the storybook:
yarn install
yarn storybook
```
2. Visit ```localhost:8080``` to see the locally run Foxglove dashboard

## Using/Testing Foxglove
- Foxglove display an abundence of information based on an imported file, these files are ```.bag``` files.

#### Download a ```.bag``` file
- We have these files located in the Azure Cloud under the processed folder, labaled as ```foxglove_filtered.bag```
- Or, we have a few demo files here under the [testBags](https://github.com/askchrisn/Foxglove/tree/main/exampleBagFiles) folder

#### Importing a ```.bag``` file
1. Download a .bag file from one of the sources above
1. In your locally hosted foxglove dashboard, click on the foxglove icon on the top left
2. Go to ```File > Open```
3. Select the file you downloaded in step 1

## Other useful commands

```sh
yarn run          # list available commands
yarn lint         # lint all files
yarn test         # run all tests
yarn test:watch   # run tests on changed files
```
## For more info
- View the buried original documentation about contributing [here](https://github.com/foxglove/studio/edit/main/CONTRIBUTING.md)

<br/>
<br/>
<br/>
<br/>
<br/>

<hr />

[![Accelerate your robotics development](https://user-images.githubusercontent.com/14011012/195918769-5aaeedf3-5de2-48fb-951e-7399f2b9e190.png)](https://foxglove.dev)

<br/>

<div align="center">
    <h1>Foxglove Studio</h1>
    <a href="https://github.com/foxglove/studio/releases"><img src="https://img.shields.io/github/v/release/foxglove/studio?label=version" /></a>
    <a href="https://github.com/foxglove/studio/blob/main/LICENSE"><img src="https://img.shields.io/github/license/foxglove/studio" /></a>
    <a href="https://github.com/orgs/foxglove/discussions"><img src="https://img.shields.io/github/discussions/foxglove/community.svg?logo=github" /></a>
    <a href="https://foxglove.dev/slack"><img src="https://img.shields.io/badge/chat-slack-purple.svg?logo=slack" /></a>
    <br />
    <br />
    <a href="https://foxglove.dev/download">Download</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://docs.foxglove.dev/docs">Docs</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://foxglove.dev/blog">Blog</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://foxglove.dev/slack">Slack</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://twitter.com/foxglovedev">Twitter</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://foxglove.dev/contact">Contact Us</a>
  <br />
  <br />

[Foxglove](https://foxglove.dev) is an integrated visualization and diagnosis tool for robotics.

  <p align="center">
    <a href="https://foxglove.dev"><img alt="Foxglove Studio screenshot" src="/resources/screenshot.png"></a>
  </p>
</div>

<hr />

To learn more, visit the following resources:

[About](https://foxglove.dev/about)
&nbsp;•&nbsp;
[Documentation](https://docs.foxglove.dev/docs)
&nbsp;•&nbsp;
[Release notes](https://github.com/foxglove/studio/releases)
&nbsp;•&nbsp;
[Blog](https://foxglove.dev/blog)

You can join us on the following platforms to ask questions, share feedback, and stay up to date on what our team is working on:

[GitHub Discussions](https://github.com/orgs/foxglove/discussions)
&nbsp;•&nbsp;
[Slack](https://foxglove.dev/slack)
&nbsp;•&nbsp;
[Newsletter](https://foxglove.dev/#footer)
&nbsp;•&nbsp;
[Twitter](https://twitter.com/foxglovedev)
&nbsp;•&nbsp;
[LinkedIn](https://www.linkedin.com/company/foxglovedev/)

<br />

## Installation

Foxglove Studio is available online at [studio.foxglove.dev](https://studio.foxglove.dev/), or desktop releases can be downloaded from [foxglove.dev/download](https://foxglove.dev/download).

## Open Source

Foxglove Studio follows an open core licensing model. Most functionality is available in this repository, and can be reproduced or modified per the terms of the [Mozilla Public License v2.0](/LICENSE).

The official binary distributions available at [studio.foxglove.dev](https://studio.foxglove.dev/) or [foxglove.dev/download](https://foxglove.dev/download) incorporate some closed-source functionality, such as integration with [Foxglove Data Platform](https://foxglove.dev/data-platform), multiple layouts, private extensions, and more. For more information on free and paid features, see our [Pricing](https://foxglove.dev/pricing).

## Self-hosting

Foxglove Studio can be self-hosted using our [docker image](https://ghcr.io/foxglove/studio). Please note that this build does not contain any closed source functionality.

```sh
docker run --rm -p "8080:8080" ghcr.io/foxglove/studio:latest
```

Foxglove Studio will be accessible in your browser at [localhost:8080](http://localhost:8080/).

### Overriding the default layout

[Bind-mount](https://docs.docker.com/storage/bind-mounts/) a layout JSON file at `/foxglove/default-layout.json` to set the default layout used when loading Studio from the Docker image.

```sh
docker run --rm -p "8080:8080" -v /path/to/custom_layout.json:/foxglove/default-layout.json ghcr.io/foxglove/studio:latest
```

## Contributing

Foxglove Studio is written in TypeScript – contributions are welcome!

Note: All contributors must agree to our [Contributor License Agreement](https://github.com/foxglove/cla). See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Credits

Foxglove Studio originally began as a fork of [Webviz](https://github.com/cruise-automation/webviz), an open source project developed by [Cruise](https://getcruise.com/). Most of the Webviz code has been rewritten, but some files still carry a Cruise license header where appropriate.
