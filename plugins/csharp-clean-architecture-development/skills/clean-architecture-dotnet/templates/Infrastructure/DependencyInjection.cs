using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.DependencyInjection;
using [ProjectName].Application.Shared;
using [ProjectName].Infrastructure.CQRS;

namespace [ProjectName].Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers a single handler by its ICommandHandler&lt;&gt; / IQueryHandler&lt;&gt; interfaces.
    /// AOT-safe: THandler is statically known; [DynamicallyAccessedMembers] tells the trimmer
    /// to preserve interface metadata for this specific type.
    /// </summary>
    public static IServiceCollection AddHandler<
        [DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.Interfaces)] THandler>(
        this IServiceCollection services)
        where THandler : class
    {
        var handlerType = typeof(THandler);
        var handlerInterfaces = handlerType.GetInterfaces()
            .Where(i => i.IsGenericType &&
                   (i.GetGenericTypeDefinition() == typeof(ICommandHandler<>) ||
                    i.GetGenericTypeDefinition() == typeof(ICommandHandler<,>) ||
                    i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)));

        foreach (var @interface in handlerInterfaces)
            services.AddScoped(@interface, handlerType);

        return services;
    }

    /// <summary>
    /// Registers CQRS buses and all application handlers.
    /// Add each new handler here with AddHandler&lt;T&gt;() when it is created.
    /// No reflection scan — fully AOT-compatible.
    /// </summary>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services)
    {
        services.AddScoped<ICommandBus, CommandBus>();
        services.AddScoped<IQueryBus, QueryBus>();

        // Add handlers here:
        // services.AddHandler<MyCommandHandler>();

        return services;
    }
}
