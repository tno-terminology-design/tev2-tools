# TRRT Documentation

[This repo](https://github.com/tno-terminology-design/trrt) contains the specifications and documentation for the [TRRT](@) tool of the [TNO Terminology Design](@) effort, which can be found by navigating across the sections of this documentation.

The **Term Ref(erence) Resolution Tool ([TRRT](@))** takes files that contain so-called [term refs](@) and outputs a copy of these files in which these [term refs](@) are converted into so-called [renderable refs](@), i.e. texts that can be further processed by tools such as GitHub pages, Docusaurus, etc. The result of this is that the rendered document contains markups that help [readers](@) to quickly find more explanations of the [concept](@) or other [knowledge artifact](@) that is being referenced.

The broader context of the tool can be found at the [TEv2 specs website](https://tno-terminology-design.github.io/tev2-specifiations).

#### The documentation consists of the following items:
- [Installation](trrt/installation): [prerequisites](trrt/installation#prerequisites), [quick installation](trrt/installation#quick-installation)
- [Usage](trrt/usage): [parameters](trrt/usage#parameters), [configuration file](trrt/usage#configuration-file)
- [Customization](trrt/customization): [interpreter](trrt/customization#interpreter), [converter](trrt/customization#converter)
- [Deployment](trrt/deployment): [examples](trrt/deployment#trrt-example), [deployment steps](trrt/deployment#executed-steps)
- [Error reporting](trrt/error-reporting): [help messages](trrt/error-reporting#help-messages), [error messages](trrt/error-reporting#error-messages)
- [Testing](trrt/testing): [cloning](trrt/testing), [compiling](trrt/testing)

#### The [specifications](trrt/specifications) consist of the following items:
- [Calling the Tool](trrt/specifications#calling-the-tool)
- [Term Ref Resolution](trrt/specifications#term-ref-resolution)
- [Processing, Errors and Warnings](trrt/specifications#processing-errors-and-warnings)
- [Deploying the Tool](trrt/specifications#deploying-the-tool)
- [Discussion Notes](trrt/specifications#discussion-notes)
