#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/runtime:6.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY ["src/Masterloop.Cloud.ChopperWorker/Masterloop.Cloud.ChopperWorker.csproj", "src/Masterloop.Cloud.ChopperWorker/"]
COPY ["src/Masterloop.Cloud.Storage/Masterloop.Cloud.Storage.csproj", "src/Masterloop.Cloud.Storage/"]
COPY ["src/Masterloop.Cloud.Core/Masterloop.Cloud.Core.csproj", "src/Masterloop.Cloud.Core/"]
COPY ["submodules/Masterloop.Core.Types/src/Masterloop.Core.Types/Masterloop.Core.Types.csproj", "submodules/Masterloop.Core.Types/src/Masterloop.Core.Types/"]
COPY ["src/Masterloop.Cloud.BusinessLayer/Masterloop.Cloud.BusinessLayer.csproj", "src/Masterloop.Cloud.BusinessLayer/"]
COPY ["submodules/Masterloop.Core.Units/src/Masterloop.Core.Units/Masterloop.Core.Units.csproj", "submodules/Masterloop.Core.Units/src/Masterloop.Core.Units/"]
RUN dotnet restore "src/Masterloop.Cloud.ChopperWorker/Masterloop.Cloud.ChopperWorker.csproj"
COPY . .
WORKDIR "/src/src/Masterloop.Cloud.ChopperWorker"
RUN dotnet build "Masterloop.Cloud.ChopperWorker.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Masterloop.Cloud.ChopperWorker.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ChopperWorker.dll"]