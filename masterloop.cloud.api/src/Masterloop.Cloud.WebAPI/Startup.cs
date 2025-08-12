using Masterloop.Cloud.BusinessLayer.Managers;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.Firmware;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.BusinessLayer.Services.Units;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Cloud.WebAPI.Handlers;
using Masterloop.Cloud.WebAPI.Models;
using Masterloop.Cloud.WebAPI.Services;
using Masterloop.Cloud.WebAPI.Templates;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json.Serialization;
using System;
using System.Text;

namespace Masterloop.Cloud.WebAPI
{
    public class Startup
    {
        private const string _BASIC_AUTHENTICATION_SCHEME = "BasicAuthentication";

        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            string databaseConnectionString = Configuration.GetConnectionString("DatabaseConnection");
            string cacheConnectionString = Configuration.GetConnectionString("CacheConnection");
            string rmqConnectionString = Configuration.GetConnectionString("RMQConnection");
            string hDiffzPath = Configuration.GetSection("FirmwareUpgrade:HDiffzPath").Value;
            string publishProtocol = Configuration.GetSection("FirmwareUpgrade:PublishProtocol").Value;

            services.AddControllers().AddNewtonsoftJson(options =>
            {
                options.SerializerSettings.ContractResolver = new DefaultContractResolver();
            });

            services.Add(new ServiceDescriptor(typeof(IDbProvider),
                ProviderFactory.GetDbProvider(DbProviderTypes.PostgreSql, databaseConnectionString)));

            services.Add(new ServiceDescriptor(typeof(ICacheProvider),
                ProviderFactory.GetCacheProvider(CacheProviderTypes.Redis, cacheConnectionString)));

            services.Configure<TokenAuthentication>(Configuration.GetSection(nameof(TokenAuthentication)));

            var key = Encoding.ASCII.GetBytes(Configuration.GetSection("TokenAuthentication:SecretKey").Value);
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            }).AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = false;
                    options.SaveToken = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(key),
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.Zero
                    };
                });

            services.AddAuthentication(_BASIC_AUTHENTICATION_SCHEME)
                .AddScheme<AuthenticationSchemeOptions, BasicAuthenticationHandler>(_BASIC_AUTHENTICATION_SCHEME, null);

            services.AddAuthorization(options =>
            {
                var defaultAuthorizationPolicyBuilder = new AuthorizationPolicyBuilder(
                    JwtBearerDefaults.AuthenticationScheme,
                    _BASIC_AUTHENTICATION_SCHEME);
                defaultAuthorizationPolicyBuilder =
                    defaultAuthorizationPolicyBuilder.RequireAuthenticatedUser();
                options.DefaultPolicy = defaultAuthorizationPolicyBuilder.Build();
            });

            services.AddScoped<ICommandManager, CommandManager>();
            services.AddScoped<IDeviceManager, DeviceManager>();
            services.AddScoped<IDevSyncManager, DevSyncManager>();
            services.AddScoped<IEventLogManager, EventLogManager>();
            services.AddScoped<ILiveConnectionManager, LiveConnectionManager>();
            services.AddScoped<IObservationManager, ObservationManager>();
            services.AddScoped<IPulseManager, PulseManager>();
            services.AddScoped<ISecurityManager, SecurityManager>();
            services.AddScoped<ISettingsManager, SettingsManager>();
            services.AddScoped<ITemplateManager, TemplateManager>();
            services.AddScoped<ITenantManager, TenantManager>();
            services.AddScoped<IFirmwareManager, FirmwareManager>();
            services.AddScoped<IDashboardManager, DashboardManager>();

            services.AddScoped<ICommandRepository, CommandRepository>();
            services.AddScoped<IDeviceRepository, DeviceRepository>();
            services.AddScoped<IEventLogRepository, EventLogRepository>();
            services.AddScoped<IObservationRepository, ObservationRepository>();
            services.AddScoped<IPulseRepository, PulseRepository>();
            services.AddScoped<ISettingsRepository, SettingsRepository>();
            services.AddScoped<ITemplateRepository, TemplateRepository>();
            services.AddScoped<ITenantRepository, TenantRepository>();
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IFirmwareRepository, FirmwareRepository>();
            services.AddScoped<INodeRepository, NodeRepository>();
            services.AddScoped<IDashboardRepository, DashboardRepository>();

            // TODO: Might need to find a better way to use RMQ connections
            // DI might not be the correct way
            services.AddSingleton<IRMQAdminClient>(x => new RMQAdminClient(rmqConnectionString));
            services.AddSingleton<IRMQPublishService>(x => new RMQPublishService(rmqConnectionString, TimeSpan.FromMinutes(10)));
            services.AddSingleton<IFirmwareService>(x => new FirmwareService(hDiffzPath, publishProtocol));
            services.AddSingleton<IUnitService>(x => new UnitService());

            services.AddScoped<ISecurityService, SecurityService>();
            services.AddScoped<IEmailService, EmailService>();
            services.AddSingleton<IAuthorizationCodeStore, InMemoryAuthorizationCodeStore>();
            services.AddTransient<ForgotPasswordTemplates>();
            // Add Cross Domain Policies
            services.AddCors(o => o.AddPolicy("CorsPolicy", builder =>
            {
                builder
                    .AllowAnyOrigin()
                    .AllowAnyMethod()
                    .AllowAnyHeader();
            }));

            // Add health check
            services.AddHealthChecks();

            services.AddControllers();

            // Register the Swagger generator, defining 1 or more Swagger documents
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v5", new OpenApiInfo { Title = "Masterloop Cloud Services API", Version = "v5" });

                var securityDefinition = new OpenApiSecurityScheme()
                {
                    Name = "Bearer",
                    BearerFormat = "JWT",
                    Scheme = "bearer",
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                };

                var securityRequirements = new OpenApiSecurityRequirement()
                {
                    {securityDefinition, new string[] { }},
                };

                c.AddSecurityDefinition("JWT", securityDefinition);
                // Make sure swagger UI requires a Bearer token to be specified
                c.AddSecurityRequirement(securityRequirements);

                c.IncludeXmlComments($"{System.AppDomain.CurrentDomain.BaseDirectory}Masterloop.Cloud.WebAPI.xml");
                c.CustomSchemaIds(i => i.FullName);
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseStaticFiles();

            app.UseCors("CorsPolicy");

            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
            });

            // Enable middleware to serve generated Swagger as a JSON endpoint.
            app.UseSwagger();
            // Enable middleware to serve swagger-ui (HTML, JS, CSS, etc.),
            // specifying the Swagger JSON endpoint.
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v5/swagger.json", "Masterloop Cloud Services API");
                c.RoutePrefix = string.Empty;
                c.InjectStylesheet("/swagger/custom.css");
            });

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHealthChecks("/health");
            });
        }
    }
}